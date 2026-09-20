// Shared tweet creation pipeline: body parsing -> validation -> media attach ->
// hashtag/mention registry -> notification fan-out -> serialization.
import { prisma } from '@/lib/prisma';
import { serializeTweet, extractMentions, extractHashtags } from '@/lib/tweet';
import { tweetIncludes } from '@/lib/tweet-db';
import { pushNotification } from '@/lib/notifications';
import { BadRequestError } from '@/lib/api';
import { validatePollInput } from '@/lib/poll-validation';
import { TWEET_MEDIA_KINDS } from '@/lib/media-kinds';

const MAX_TEXT = 280;
const MAX_MEDIA = 4;

export interface CreateTweetInput {
  text?: string;
  mediaIds?: unknown;
  mediaAssetId?: unknown;
  replyToId?: number;
  retweetOfId?: number;
  quotedTweetId?: number;
  poll?: { question?: unknown; options?: unknown; durationMinutes?: unknown } | null;
}

export interface CreateTweetOptions {
  authorId: number;
  myUsername: string;
  parent?: { id: number; authorId: number; visibility: string } | null;
  quoted?: { id: number; authorId: number; visibility: string } | null;
}

export async function resolveMediaList(mediaIds: string[], meId: number) {
  const unique = Array.from(new Set(mediaIds));
  let media: { id: string; userId: number }[] = [];
  if (unique.length > 0) {
    media = await prisma.media.findMany({ where: { id: { in: unique } }, select: { id: true, userId: true } });
    if (media.length !== unique.length) throw new BadRequestError('Media not found');
    const wrongOwner = media.find((m) => m.userId !== meId);
    if (wrongOwner) {
      const e = new BadRequestError('Media does not belong to you');
      (e as any).status = 403;
      throw e;
    }
    const already = await prisma.tweetAsset.count({ where: { mediaId: { in: unique } } });
    if (already > 0) throw new BadRequestError('A file is already attached to a tweet');
  }
  return media;
}

export async function persistTweetTags(tweetId: number, text: string) {
  const tags = extractHashtags(text);
  if (tags.length === 0) return;
  for (const tag of tags) {
    // Normalize to lowercase for the registry so "#AI" and "#ai" collide.
    const hashtag = await prisma.hashtag.upsert({
      where: { tag: tag.toLowerCase() },
      update: {},
      create: { tag: tag.toLowerCase() },
      select: { id: true },
    });
    await prisma.tweetHashtag.upsert({
      where: { tweetId_hashtagId: { tweetId, hashtagId: hashtag.id } },
      update: {},
      create: { tweetId, hashtagId: hashtag.id, pos: 0 },
    });
  }
}

export async function persistTweetMentions(tweetId: number, text: string) {
  const names = Array.from(new Set(extractMentions(text).map((n) => n.toLowerCase())));
  if (names.length === 0) return;
  const users = await prisma.user.findMany({ where: { username: { in: names } }, select: { id: true } });
  if (users.length === 0) return;
  await prisma.tweetMention.createMany({
    data: users.map((u) => ({ tweetId, mentionedId: u.id })),
    skipDuplicates: true,
  });
}

export async function collectMentionNotifications(
  text: string,
  me: { id: number; username: string },
  excludeIds: number[],
  tweetId: number
): Promise<{ userId: number; kind: string; payload: Record<string, unknown> }[]> {
  const queue: { userId: number; kind: string; payload: Record<string, unknown> }[] = [];
  const names = extractMentions(text).filter((n) => n.toLowerCase() !== me.username.toLowerCase());
  if (names.length === 0) return queue;
  const mentioned = await prisma.user.findMany({ where: { username: { in: names } }, select: { id: true, username: true } });
  for (const target of mentioned) {
    if (target.id === me.id || excludeIds.includes(target.id)) continue;
    queue.push({ userId: target.id, kind: 'TWEET_MENTION', payload: { fromId: me.id, tweetId, username: target.username, text: text.slice(0, 120) } });
  }
  return queue;
}

export async function createTweetRecord(input: CreateTweetInput, opts: CreateTweetOptions) {
  const text = typeof input.text === 'string' ? input.text.trim() : '';
  const replyToId = Number(input.replyToId ?? 0);
  const retweetOfId = Number(input.retweetOfId ?? 0);
  const quotedTweetId = Number(input.quotedTweetId ?? 0);
  const legacyMedia = typeof input.mediaAssetId === 'string' ? input.mediaAssetId.trim() : '';
  const rawMediaIds = Array.isArray(input.mediaIds)
    ? input.mediaIds.filter((m: unknown) => typeof m === 'string' && m)
    : [];
  const mediaIds = Array.from(new Set([...rawMediaIds, ...(legacyMedia && !rawMediaIds.includes(legacyMedia) ? [legacyMedia] : [])]));

  if (text.length > MAX_TEXT) throw new BadRequestError(`Tweets are limited to ${MAX_TEXT} characters`);
  if (mediaIds.length > MAX_MEDIA) throw new BadRequestError(`A tweet can carry up to ${MAX_MEDIA} photos or videos`);
  if (!text && mediaIds.length === 0 && !retweetOfId && !quotedTweetId) throw new BadRequestError('Say something first');
  if (replyToId > 0 && retweetOfId > 0) throw new BadRequestError('A retweet cannot be a reply');
  if (quotedTweetId > 0 && retweetOfId > 0) throw new BadRequestError('A quote cannot be a retweet');
  if (quotedTweetId > 0 && !text) throw new BadRequestError('Add a comment to quote this tweet');
  if (input.poll && retweetOfId > 0) throw new BadRequestError('A retweet cannot have a poll');
  if (input.poll && mediaIds.length > 0) throw new BadRequestError('A tweet can have a poll or media, not both');

  let parent = opts.parent;
  if (replyToId > 0 && !parent) {
    parent = await prisma.tweet.findUnique({ where: { id: replyToId }, select: { id: true, visibility: true, authorId: true } });
    if (!parent || parent.visibility !== 'PUBLIC') throw new BadRequestError('Tweet not found');
  }
  let quoted = opts.quoted;
  if (quotedTweetId > 0 && !quoted) {
    quoted = await prisma.tweet.findUnique({ where: { id: quotedTweetId }, select: { id: true, visibility: true, authorId: true } });
    if (!quoted || quoted.visibility !== 'PUBLIC') throw new BadRequestError('Tweet not found');
  }
  if (retweetOfId > 0) {
    const source = await prisma.tweet.findUnique({ where: { id: retweetOfId }, select: { id: true, visibility: true } });
    if (!source || source.visibility !== 'PUBLIC') throw new BadRequestError('Tweet not found');
  }

  const media = await resolveMediaList(mediaIds, opts.authorId);

  const t = await prisma.tweet.create({
    data: {
      authorId: opts.authorId,
      text,
      replyToId: replyToId > 0 ? replyToId : null,
      retweetOfId: retweetOfId > 0 ? retweetOfId : null,
      quotedTweetId: quotedTweetId > 0 ? quotedTweetId : null,
    },
    include: tweetIncludes(opts.authorId),
  });

  if (media.length > 0) {
    await prisma.tweetAsset.createMany({
      data: media.map((m, index) => ({ tweetId: t.id, mediaId: m.id, pos: index })),
    });
  }
  if (text) {
    await Promise.all([persistTweetTags(t.id, text), persistTweetMentions(t.id, text)]);
  }
  if (input.poll) {
    await createPollForTweet(t.id, input.poll);
  }

  const notifications: { userId: number; kind: string; payload: Record<string, unknown> }[] = [];
  if (parent && parent.authorId !== opts.authorId) {
    notifications.push({ userId: parent.authorId, kind: 'TWEET_REPLY', payload: { fromId: opts.authorId, tweetId: t.id, parentId: parent.id, text: text.slice(0, 120) } });
  }
  if (quoted && quoted.authorId !== opts.authorId) {
    notifications.push({ userId: quoted.authorId, kind: 'TWEET_QUOTE', payload: { fromId: opts.authorId, tweetId: t.id, quotedId: quoted.id, text: text.slice(0, 120) } });
  }
  if (text) {
    const mentionNotes = await collectMentionNotifications(
      text,
      { id: opts.authorId, username: opts.myUsername },
      [...(parent ? [parent.authorId] : [])],
      t.id
    );
    notifications.push(...mentionNotes);
  }
  for (const item of notifications) {
    await pushNotification(item.userId, item.kind, item.payload);
  }

  const fresh =
    media.length > 0 || input.poll
      ? await prisma.tweet.findUnique({ where: { id: t.id }, include: tweetIncludes(opts.authorId) })
      : t;
  return { tweet: serializeTweet(fresh ?? t, retweetOfId > 0), hasMedia: media.length > 0 };
}

async function createPollForTweet(tweetId: number, raw: NonNullable<CreateTweetInput['poll']>) {
  const { question, options, durationMinutes, expiresAt } = validatePollInput(raw);

  await prisma.poll.create({
    data: {
      tweetId,
      question,
      durationMinutes,
      expiresAt,
      options: { create: options.map((text) => ({ text })) },
    },
  });
}

export { MAX_TEXT, MAX_MEDIA };

// Kept for callers that still reference "tweet kind" media semantics.
export const MEDIA_KINDS = TWEET_MEDIA_KINDS;