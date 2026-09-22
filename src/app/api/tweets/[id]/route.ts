import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { serializeTweet } from '@/lib/tweet';
import { normalizeFacets, stringifyFacets } from '@/lib/tweet-facets';
import { tweetIncludes, recordTweetView, canViewAuthor } from '@/lib/tweet-db';
import { persistTweetTags, persistTweetMentions } from '@/lib/tweet-create';
import { livePublish } from '@/lib/live-publish';

type Ctx = { params: { id: string } };

const MAX_TEXT = 280;

async function findTweet(id: number, userId: number) {
  const tweet = await prisma.tweet.findFirst({
    where: { id, visibility: 'PUBLIC' },
    include: {
      ...tweetIncludes(userId),
      replyTo: { include: tweetIncludes(userId) },
    },
  });
  if (!tweet) return null;
  if (!(await canViewAuthor(tweet.authorId, userId))) return null;
  const myRetweet = await prisma.tweet.findFirst({ where: { retweetOfId: tweet.id, authorId: userId }, select: { id: true } });
  const retweeted = !!myRetweet;
  const revealParent = tweet.replyTo && await canViewAuthor(tweet.replyTo.authorId, userId);
  const replyParent = tweet.replyTo && revealParent ? serializeTweet(tweet.replyTo, false) : null;
  return { tweet: serializeTweet(tweet, retweeted), replyParent };
}

export const GET = handle(async (_req, { params }: Ctx) => {
  const me = await requireUser();
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return err('Invalid tweet', 400);
  const found = await findTweet(id, me.id);
  if (!found) return err('Tweet not found', 404);
  // Count impressions once per viewer per day (deduped), skip own content.
  if (found.tweet.author.id !== me.id) {
    void recordTweetView(id, me.id).catch(() => {});
    found.tweet.views += 1;
  }
  return json(found);
});

export const PATCH = handle(async (req, { params }: Ctx) => {
  const me = await requireUser();
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return err('Invalid tweet', 400);
  const tweet = await prisma.tweet.findUnique({ where: { id }, select: { id: true, authorId: true, retweetOfId: true } });
  if (!tweet) return err('Tweet not found', 404);
  if (tweet.authorId !== me.id) return err('Forbidden', 403);
  if (tweet.retweetOfId) return err('Reposts cannot be edited');

  const body = await req.json().catch(() => ({}));
  const text = typeof body.text === 'string' ? body.text.trim() : '';
  if (!text) return err('Tweets need a message');
  if (text.length > MAX_TEXT) return err(`Tweets are limited to ${MAX_TEXT} characters`);

  const updated = await prisma.tweet.update({
    where: { id },
    data: { text, facets: stringifyFacets(normalizeFacets(body.facets, text.length)) },
    include: tweetIncludes(me.id),
  });

  // Refresh persistent registries from the new text.
  await prisma.$transaction([
    prisma.tweetHashtag.deleteMany({ where: { tweetId: id } }),
    prisma.tweetMention.deleteMany({ where: { tweetId: id } }),
  ]);
  if (text) {
    await Promise.all([persistTweetTags(id, text), persistTweetMentions(id, text)]);
  }
  const result = { tweet: serializeTweet(updated, false) };
  livePublish(['tweet:public', `user:${me.id}`], 'tweet:update', { tweetId: id, authorId: me.id, text });
  return json(result);
});

export const DELETE = handle(async (_req, { params }: Ctx) => {
  const me = await requireUser();
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return err('Invalid tweet', 400);
  const tweet = await prisma.tweet.findUnique({ where: { id }, select: { id: true, authorId: true } });
  if (!tweet) return err('Tweet not found', 404);
  if (tweet.authorId !== me.id && !me.isAdmin) return err('Forbidden', 403);
  await prisma.tweet.delete({ where: { id } });
  livePublish(['tweet:public', `user:${tweet.authorId}`], 'tweet:delete', { tweetId: id, authorId: tweet.authorId });
  return json({ ok: true });
});