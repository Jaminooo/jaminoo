import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { serializeTweet } from '@/lib/tweet';
import { tweetIncludes, hiddenAuthorIds, canViewAuthor } from '@/lib/tweet-db';
import { createTweetRecord } from '@/lib/tweet-create';
import { livePublish } from '@/lib/live-publish';

type Ctx = { params: { id: string } };

export const GET = handle(async (req, { params }: Ctx) => {
  const me = await requireUser();
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return err('Invalid tweet', 400);
  const parent = await prisma.tweet.findUnique({ where: { id }, select: { id: true, visibility: true, authorId: true } });
  if (!parent || parent.visibility !== 'PUBLIC') return err('Tweet not found', 404);
  if (!(await canViewAuthor(parent.authorId, me.id))) return err('Tweet not found', 404);
  const hidden = await hiddenAuthorIds(me.id);

  const cursor = Number(new URL(req.url).searchParams.get('cursor') ?? 0);
  const where: any = { replyToId: id, visibility: 'PUBLIC' };
  if (hidden.length > 0) where.authorId = { notIn: hidden };
  where.author = { is: { OR: [{ isPrivate: false }, { isPrivate: true, tweetFollowers: { some: { followerId: me.id } } }] } };
  if (Number.isInteger(cursor) && cursor > 0) where.id = { lt: cursor };
  const rows = await prisma.tweet.findMany({
    where,
    orderBy: { id: 'desc' },
    take: 25,
    include: tweetIncludes(me.id),
  });
  const hasMore = rows.length > 24;
  const page = hasMore ? rows.slice(0, 24) : rows;
  const ids = page.map((t) => t.id);
  const myRetweets = ids.length > 0
    ? await prisma.tweet.findMany({ where: { retweetOfId: { in: ids }, authorId: me.id }, select: { retweetOfId: true } })
    : [];
  const retweetedSet = new Set(myRetweets.map((r) => r.retweetOfId));
  return json({
    replies: page.map((t) => serializeTweet(t, retweetedSet.has(t.id))),
    nextCursor: hasMore ? String(page[page.length - 1].id) : null,
    hasMore,
  });
});

export const POST = handle(async (req, { params }: Ctx) => {
  const me = await requireUser();
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return err('Invalid tweet', 400);
  const parent = await prisma.tweet.findUnique({ where: { id }, select: { id: true, visibility: true, authorId: true } });
  if (!parent || parent.visibility !== 'PUBLIC') return err('Tweet not found', 404);
  if (!(await canViewAuthor(parent.authorId, me.id))) return err('Tweet not found', 404);

  const hidden = await hiddenAuthorIds(me.id);
  if (hidden.includes(parent.authorId)) return err('You cannot reply to this user', 403);

  const body = await req.json().catch(() => ({}));
  const { tweet } = await createTweetRecord(
    { ...body, replyToId: parent.id },
    { authorId: me.id, myUsername: me.username, parent }
  );

  livePublish(['tweet:public', `user:${me.id}`], 'tweet:new', { tweet, authorId: me.id });
  livePublish([`tweet:${parent.id}`], 'tweet:reply', { tweetId: parent.id, tweet, authorId: me.id });

  return json({ tweet, reply: tweet }, 201);
});