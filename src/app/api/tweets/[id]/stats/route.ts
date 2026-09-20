import { handle, json, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';

export const GET = handle(async (_req, { params }: { params: { id: string } }) => {
  const me = await requireUser();
  const id = Number(params.id);
  const tweet = await prisma.tweet.findUnique({ where: { id }, select: { id: true, authorId: true } });
  if (!tweet) return json({ error: 'Tweet not found' }, 404);
  if (tweet.authorId !== me.id) return json({ error: 'Only the author can view analytics' }, 403);

  const [views, likes, bookmarks, reposts, replies, quotes] = await Promise.all([
    prisma.tweetView.aggregate({ where: { tweetId: id }, _sum: { count: true } }),
    prisma.tweetLike.count({ where: { tweetId: id } }),
    prisma.tweetBookmark.count({ where: { tweetId: id } }),
    prisma.tweet.count({ where: { retweetOfId: id } }),
    prisma.tweet.count({ where: { replyToId: id } }),
    prisma.tweet.count({ where: { quotedTweetId: id } }),
  ]);

  const impressions = views._sum.count ?? 0;
  const engagements = likes + bookmarks + reposts + replies + quotes;
  const engagementRate = impressions > 0 ? Math.round((engagements / impressions) * 1000) / 10 : 0;

  return json({
    stats: {
      impressions,
      likes,
      bookmarks,
      reposts,
      replies,
      quotes,
      engagements,
      engagementRate,
    },
  });
});