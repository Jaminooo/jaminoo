import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { serializeTweet } from '@/lib/tweet';
import { tweetIncludes } from '@/lib/tweet-db';
import { pushNotification } from '@/lib/notifications';
import { livePublish } from '@/lib/live-publish';
import { rateLimit } from '@/lib/rate-limit';

type Ctx = { params: { id: string } };

export const POST = handle(async (_req, { params }: Ctx) => {
  const me = await requireUser();
  rateLimit(`tweets:repost:${me.id}`, 60, 60 * 60 * 1000);
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return err('Invalid tweet', 400);
  const tweet = await prisma.tweet.findUnique({ where: { id }, select: { id: true, visibility: true, authorId: true } });
  if (!tweet || tweet.visibility !== 'PUBLIC') return err('Tweet not found', 404);

  const existing = await prisma.tweet.findFirst({ where: { retweetOfId: id, authorId: me.id }, select: { id: true } });
  if (existing) {
    await prisma.tweet.delete({ where: { id: existing.id } });
    livePublish(['tweet:public', `user:${me.id}`], 'tweet:delete', { tweetId: existing.id, authorId: me.id });
  } else {
    const created = await prisma.tweet.create({ data: { authorId: me.id, text: '', retweetOfId: id } });
    if (tweet.authorId !== me.id) {
      await pushNotification(tweet.authorId, 'TWEET_RETWEET', { fromId: me.id, tweetId: id });
    }
    const serialized = await prisma.tweet.findUnique({ where: { id: created.id }, include: tweetIncludes(me.id) });
    if (serialized) {
      livePublish(['tweet:public', `user:${me.id}`], 'tweet:new', { tweet: serializeTweet(serialized, false), authorId: me.id });
    }
  }
  const retweets = await prisma.tweet.count({ where: { retweetOfId: id } });
  const payload = { tweetId: id, authorId: tweet.authorId, reposted: !existing, reposts: retweets };
  livePublish([`tweet:${id}`, `user:${tweet.authorId}`], 'tweet:repost', payload);
  return json({ retweeted: !existing, retweets });
});