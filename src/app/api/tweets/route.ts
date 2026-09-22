import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/rate-limit';
import { serializeTweet } from '@/lib/tweet';
import { tweetIncludes, hiddenAuthorIds } from '@/lib/tweet-db';
import { TWEET_MEDIA_KINDS } from '@/lib/media-kinds';
import { createTweetRecord } from '@/lib/tweet-create';
import { parseTweetQuery } from '@/lib/tweet-search';
import { rankForYou, FOR_YOU_POOL_SIZE, FRESH_WINDOW_MS } from '@/lib/tweet-ranking';
import { livePublish } from '@/lib/live-publish';

export const GET = handle(async (req) => {
  const me = await requireUser();
  const params = new URL(req.url).searchParams;
  const view = params.get('view') ?? 'home';
  const q = params.get('q')?.trim() ?? '';
  const profile = params.get('profile')?.trim() ?? '';
  const tab = params.get('tab')?.trim() ?? 'posts';
  const cursor = Number(params.get('cursor') ?? 0);
  const trending = view === 'trending';

  const hidden = await hiddenAuthorIds(me.id);
  const parsedQuery = parseTweetQuery(q);

  // -- user search results -------------------------------------------
  let users: unknown[] = [];
  const userQuery = parsedQuery.text ? parsedQuery.text.replace(/^@/, '').trim() : '';
  if (userQuery.length >= 2) {
    const excluded = Array.from(new Set([...hidden, me.id]));
    const rows = await prisma.user.findMany({
      where: {
        NOT: excluded.length > 0 ? { id: { in: excluded } } : undefined,
        OR: [{ username: { contains: userQuery, mode: 'insensitive' } }, { name: { contains: userQuery, mode: 'insensitive' } }],
      },
      take: 6,
      include: {
        _count: { select: { tweets: true, tweetFollowers: true } },
        tweetFollowing: { where: { followerId: me.id }, take: 1, select: { id: true } },
      },
    });
    users = rows.map((u) => ({
      id: u.id,
      username: u.username,
      name: u.name,
      avatarId: u.avatarId,
      avatarPhoto: u.profilePhotoId ? `/api/media/${u.profilePhotoId}` : null,
      bio: u.bio,
      tweets: u._count.tweets,
      followers: u._count.tweetFollowers,
      following: u.tweetFollowing.length > 0,
    }));
  }

  // -- tweet feed -----------------------------------------------------
  let where: any = { visibility: 'PUBLIC' };
  if (hidden.length > 0) where.authorId = { notIn: hidden };

  if (view === 'following') {
    where.author = { is: { tweetFollowers: { some: { followerId: me.id } } } };
  } else if (view === 'bookmarks') {
    const collectionId = Number(params.get('collection') ?? 0);
    where.bookmarks = { some: { userId: me.id, ...(collectionId > 0 ? { collectionId } : {}) } };
  } else if (view === 'hashtag') {
    const tag = params.get('tag')?.trim().toLowerCase() ?? '';
    if (!tag) return err('A tag is required');
    const hashtag = await prisma.hashtag.findUnique({ where: { tag }, select: { id: true } });
    if (hashtag) {
      where.hashtags = { some: { hashtagId: hashtag.id } };
    } else {
      where.text = { contains: `#${tag}`, mode: 'insensitive' };
    }
  } else if (view === 'profile') {
    if (!profile) return err('A username is required for this view');
    where.author = { is: { username: profile } };
    if (tab === 'replies') {
      where.replyToId = { not: null };
    } else if (tab === 'media') {
      where.assets = { some: { media: { kind: { in: [...TWEET_MEDIA_KINDS] } } } };
    } else if (tab === 'likes') {
      const target = await prisma.user.findUnique({ where: { username: profile }, select: { id: true } });
      if (!target) return err('User not found', 404);
      where.likes = { some: { userId: target.id } };
    }
  }

  if ((view !== 'profile' || tab === 'posts') && view !== 'bookmarks' && view !== 'hashtag') where.replyToId = null;

  if (parsedQuery.text || parsedQuery.hasFilters) {
    const filters: any[] = [];
    const clauses: any[] = [];

    if (parsedQuery.text) {
      const terms = parsedQuery.text.split(/\s+/).filter(Boolean);
      for (const term of terms) {
        if (term.startsWith('@') && term.length > 1) {
          clauses.push({
            OR: [
              { text: { contains: term, mode: 'insensitive' } },
              { author: { is: { username: { contains: term.slice(1), mode: 'insensitive' } } } },
            ],
          });
        } else {
          clauses.push({ text: { contains: term, mode: 'insensitive' } });
        }
      }
    }

    if (parsedQuery.to) {
      clauses.push({
        OR: [
          { replyTo: { is: { author: { is: { username: parsedQuery.to } } } } },
          { mentions: { some: { mentioned: { is: { username: parsedQuery.to } } } } },
        ],
      });
    }

    if (parsedQuery.from && parsedQuery.from !== me.username) {
      const fromUser = await prisma.user.findUnique({ where: { username: parsedQuery.from }, select: { id: true } });
      if (!fromUser) return json({ tweets: [], users, nextCursor: null, hasMore: false });
      where.authorId = fromUser.id;
    }

    if (parsedQuery.since) clauses.push({ createdAt: { gte: parsedQuery.since } });
    if (parsedQuery.until) clauses.push({ createdAt: { lt: parsedQuery.until } });

    if (parsedQuery.mediaOnly) {
      clauses.push({ assets: { some: { media: { kind: { in: [...TWEET_MEDIA_KINDS] } } } } });
    }
    if (parsedQuery.linksOnly) {
      clauses.push({ text: { contains: 'http', mode: 'insensitive' } });
    }

    if (parsedQuery.minFaves) {
      const rows = await prisma.$queryRaw<{ id: number }[]>`
        SELECT "tweetId" AS "id" FROM "TweetLike" GROUP BY "tweetId" HAVING COUNT("id") >= ${parsedQuery.minFaves}`;
      if (rows.length === 0) return json({ tweets: [], users, nextCursor: null, hasMore: false });
      clauses.push({ id: { in: rows.map((row) => row.id) } });
    }

    if (clauses.length > 0) filters.push({ AND: clauses });
    where.AND = [...(where.AND ?? []), ...filters];
  }
  // Private-account gate: content from private accounts is only visible to
  // approved followers (and the account owner).
  where.AND = [
    ...(where.AND ?? []),
    {
      OR: [
        { author: { isPrivate: false } },
        { author: { id: me.id } },
        { author: { isPrivate: true, tweetFollowers: { some: { followerId: me.id } } } },
      ],
    },
  ];
  let rows: Awaited<ReturnType<typeof prisma.tweet.findMany>> = [];
  let nextCursor: string | null = null;
  let hasMore = false;

  if (view === 'home') {
    // For You: deterministic engagement + recency ranking over a bounded pool.
    const cutoff = new Date(Date.now() - FRESH_WINDOW_MS);
    where.createdAt = { gte: cutoff };
    const [candidates, follows, followerEdges] = await Promise.all([
      prisma.tweet.findMany({ where, orderBy: { id: 'desc' }, take: FOR_YOU_POOL_SIZE, include: tweetIncludes(me.id) }),
      prisma.tweetFollow.findMany({ where: { followerId: me.id }, select: { followingId: true } }),
      prisma.tweetFollow.findMany({ where: { followingId: me.id }, select: { followerId: true } }),
    ]);
    const following = new Set(follows.map((f) => f.followingId));
    const mutual = new Set(followerEdges.map((f) => f.followerId).filter((id) => following.has(id)));
    const ranked = rankForYou(candidates, { following, mutual });
    const offset = Math.max(0, Math.floor(Number(cursor) || 0));
    rows = ranked.slice(offset, offset + 15) as unknown as typeof rows;
    hasMore = offset + 15 < ranked.length;
    nextCursor = hasMore ? String(offset + rows.length) : null;
  } else {
    if (Number.isInteger(cursor) && cursor > 0) where.id = { lt: cursor };
    const orderBy: any = trending ? [{ likes: { _count: 'desc' } }, { id: 'desc' }] : [{ id: 'desc' }];
    rows = await prisma.tweet.findMany({
      where,
      orderBy,
      take: 15,
      include: tweetIncludes(me.id),
    });
    hasMore = rows.length > 14;
    rows = hasMore ? rows.slice(0, 14) : rows;
    nextCursor = hasMore && rows.length > 0 ? String(rows[rows.length - 1].id) : null;
  }

  const ids = rows.map((t) => t.id);
  const myRetweets = ids.length > 0
    ? await prisma.tweet.findMany({ where: { retweetOfId: { in: ids }, authorId: me.id }, select: { retweetOfId: true } })
    : [];
  const retweetedSet = new Set(myRetweets.map((r) => r.retweetOfId));
  return json({
    tweets: rows.map((t) => serializeTweet(t, retweetedSet.has(t.id))),
    nextCursor,
    hasMore,
    users,
  });
});

export const POST = handle(async (req) => {
  const me = await requireUser();
  rateLimit(`tweets:post:${me.id}`, 30, 60 * 1000);

  const body = await req.json().catch(() => ({}));
  const text = typeof body.text === 'string' ? body.text.trim() : '';
  const replyToId = Number(body.replyToId ?? 0);
  const retweetOfId = Number(body.retweetOfId ?? 0);
  const quotedTweetId = Number(body.quotedTweetId ?? 0);

  if (!text && retweetOfId <= 0 && quotedTweetId <= 0 && !Array.isArray(body.mediaIds) && !body.mediaAssetId) {
    return err('Say something first');
  }

  const blockedIds = (await hiddenAuthorIds(me.id)).filter((id) => id !== me.id);

  // Resolve parent/quotes early so blocked authors are rejected before creating.
  let parent: { id: number; visibility: string; authorId: number } | null = null;
  if (replyToId > 0) {
    parent = await prisma.tweet.findUnique({ where: { id: replyToId }, select: { id: true, visibility: true, authorId: true } });
    if (!parent || parent.visibility !== 'PUBLIC') return err('Tweet not found', 404);
    if (blockedIds.includes(parent.authorId)) return err('You cannot reply to this user', 403);
  }
  let quoted: { id: number; visibility: string; authorId: number } | null = null;
  if (quotedTweetId > 0) {
    quoted = await prisma.tweet.findUnique({ where: { id: quotedTweetId }, select: { id: true, visibility: true, authorId: true } });
    if (!quoted || quoted.visibility !== 'PUBLIC') return err('Tweet not found', 404);
    if (blockedIds.includes(quoted.authorId)) return err('You cannot quote this user', 403);
  }

  const { tweet } = await createTweetRecord(
    { text, replyToId, retweetOfId, quotedTweetId, mediaIds: body.mediaIds, mediaAssetId: body.mediaAssetId, facets: body.facets },
    { authorId: me.id, myUsername: me.username, parent, quoted }
  );

  livePublish(['tweet:public', `user:${me.id}`], 'tweet:new', { tweet, authorId: me.id });
  return json({ tweet }, 201);
});