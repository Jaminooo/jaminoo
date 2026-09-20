import { handle, json, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';

// Trending hashtags computed from the persistent registry + engagement
// velocity. A hashtag scores as:
//
//   velocity = 3 * mentions + likes + 2 * retweets + 2 * replies
//
// counted over the last 48 hours. This favors topics that are both frequent
// and actively engaged with. If nothing moved in the window (quiet feed), we
// fall back to a 7-day mention count so the rail never goes empty.

const VELOCITY_WINDOW_MS = 48 * 60 * 60 * 1000;
const FALLBACK_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

type TrendRaw = {
  hashtagId: bigint;
  mentions: bigint;
  likes: bigint;
  retweets: bigint;
  replies: bigint;
};

async function aggregate(since: Date): Promise<TrendRaw[]> {
  return prisma.$queryRaw<TrendRaw[]>`
    SELECT th."hashtagId" AS "hashtagId",
           COUNT(DISTINCT th."tweetId") AS "mentions",
           COUNT(l."id") AS "likes",
           COUNT(r."id") AS "retweets",
           COUNT(p."id") AS "replies"
    FROM "TweetHashtag" AS th
    JOIN "Tweet" AS t ON t."id" = th."tweetId" AND t."visibility" = 'PUBLIC'
    LEFT JOIN "TweetLike" AS l ON l."tweetId" = t."id" AND l."createdAt" >= ${since}
    LEFT JOIN "Tweet" AS r ON r."retweetOfId" = t."id" AND r."createdAt" >= ${since}
    LEFT JOIN "Tweet" AS p ON p."replyToId" = t."id" AND p."createdAt" >= ${since}
    WHERE t."createdAt" >= ${since}
    GROUP BY th."hashtagId"`;
}

export const GET = handle(async () => {
  await requireUser();

  let rows = await aggregate(new Date(Date.now() - VELOCITY_WINDOW_MS));
  let windowLabel = '48h';
  if (rows.length === 0) {
    rows = await aggregate(new Date(Date.now() - FALLBACK_WINDOW_MS));
    windowLabel = '7d';
  }
  if (rows.length === 0) return json({ trends: [], window: windowLabel });

  const scored = rows
    .map((row) => ({
      hashtagId: Number(row.hashtagId),
      mentions: Number(row.mentions),
      velocity:
        3 * Number(row.mentions) + Number(row.likes) + 2 * Number(row.retweets) + 2 * Number(row.replies),
    }))
    .sort((a, b) => b.velocity - a.velocity || b.hashtagId - a.hashtagId)
    .slice(0, 10);

  const tags = await prisma.hashtag.findMany({
    where: { id: { in: scored.map((item) => item.hashtagId) } },
    select: { id: true, tag: true },
  });
  const byId = new Map(tags.map((tag) => [tag.id, tag.tag]));

  return json({
    trends: scored
      .filter((item) => byId.has(item.hashtagId))
      .map((item) => ({ tag: byId.get(item.hashtagId), count: item.mentions })),
    window: windowLabel,
  });
});