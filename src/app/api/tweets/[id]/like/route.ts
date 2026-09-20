import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { pushNotification } from '@/lib/notifications';
import { livePublish } from '@/lib/live-publish';
import { rateLimit } from '@/lib/rate-limit';

type Ctx = { params: { id: string } };

export const POST = handle(async (_req, { params }: Ctx) => {
  const me = await requireUser();
  rateLimit(`tweets:like:${me.id}`, 120, 60 * 60 * 1000);
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return err('Invalid tweet', 400);
  const tweet = await prisma.tweet.findUnique({ where: { id }, select: { id: true, visibility: true, authorId: true } });
  if (!tweet || tweet.visibility !== 'PUBLIC') return err('Tweet not found', 404);

  const existing = await prisma.tweetLike.findUnique({ where: { tweetId_userId: { tweetId: id, userId: me.id } } });
  if (existing) {
    await prisma.tweetLike.delete({ where: { id: existing.id } });
  } else {
    await prisma.tweetLike.create({ data: { tweetId: id, userId: me.id } });
    if (tweet.authorId !== me.id) {
      await pushNotification(tweet.authorId, 'TWEET_LIKE', { fromId: me.id, tweetId: id });
    }
  }
  const likes = await prisma.tweetLike.count({ where: { tweetId: id } });
  const payload = { tweetId: id, authorId: tweet.authorId, liked: !existing, likes };
  livePublish([`tweet:${id}`, `user:${tweet.authorId}`], 'tweet:like', payload);
  return json({ liked: !existing, likes });
});