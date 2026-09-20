// Deterministic "For You" feed ranking.
//
// Ranking formula (documented; same inputs always produce the same output):
//
//   recency  = max(0, 1 - ageMs / FRESH_WINDOW_MS)          // 1.0 → 0.0 over 7 days
//   score    = floor(1000 * recency)
//            + min(500, likes)    + 2 * min(300, retweets)
//            + min(300, replies)  + min(200, quotes)
//            + (mutualFollow ? 80   : 0)                     // accounts that follow me
//            + (iFollowThem ? 40   : 0)                      // accounts I follow
//
// Ties are broken by newest id first, so the whole order is stable. Engagement
// terms are capped so one viral tweet cannot drown out everything else, and the
// linear recency term keeps the feed fresh without needing a background job.
//
// The route feeds this a bounded candidate pool (the 400 latest top-level
// tweets in the window) so per-request cost stays constant.

export interface RankableTweet {
  id: number;
  authorId: number;
  createdAt: Date;
  _count: { likes: number; retweets: number; replies: number; quotes: number };
}

export const FRESH_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
export const FOR_YOU_POOL_SIZE = 400;

export function rankForYou(
  tweets: RankableTweet[],
  graph: { following: Set<number>; mutual: Set<number> },
  now = Date.now()
) {
  const { following, mutual } = graph;
  const scored = tweets.map((tweet) => {
    const age = now - tweet.createdAt.getTime();
    const recency = Math.max(0, 1 - age / FRESH_WINDOW_MS);
    const score =
      Math.floor(1000 * recency) +
      Math.min(500, tweet._count.likes) +
      2 * Math.min(300, tweet._count.retweets) +
      Math.min(300, tweet._count.replies) +
      Math.min(200, tweet._count.quotes) +
      (mutual.has(tweet.authorId) ? 80 : 0) +
      (following.has(tweet.authorId) ? 40 : 0);
    return { tweet, score };
  });
  return scored.sort((a, b) => b.score - a.score || b.tweet.id - a.tweet.id).map((item) => item.tweet);
}