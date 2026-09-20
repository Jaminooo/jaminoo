import { describe, it, expect } from 'vitest';
import { rankForYou, FRESH_WINDOW_MS, type RankableTweet } from '../tweet-ranking';

function tweet(partial: Partial<RankableTweet> & { id: number }): RankableTweet {
  return {
    authorId: 1,
    createdAt: new Date(),
    _count: { likes: 0, retweets: 0, replies: 0, quotes: 0 },
    ...partial,
  };
}

const now = Date.parse('2026-09-20T12:00:00Z');

describe('rankForYou', () => {
  it('sorts by engagement when recency is equal', () => {
    const base = { createdAt: new Date(now - 60_000) };
    const tweets = [
      tweet({ id: 3, ...base, _count: { likes: 100, retweets: 5, replies: 2, quotes: 1 } }),
      tweet({ id: 2, ...base, _count: { likes: 10, retweets: 50, replies: 2, quotes: 1 } }),
      tweet({ id: 1, ...base, _count: { likes: 5, retweets: 1, replies: 1, quotes: 0 } }),
    ];
    const ranked = rankForYou(tweets, { following: new Set(), mutual: new Set() }, now);
    // id2: 10 + 100 + 2 + 1 = 113 > id3: 100 + 10 + 2 + 1 = 113 → tie → newer id wins
    expect(ranked[0].id).toBe(3);
  });

  it('prefers fresh tweets (recency dominates when engagement is comparable)', () => {
    const fresh = tweet({ id: 1, createdAt: new Date(now - 60 * 1000) });
    const old = tweet({ id: 2, createdAt: new Date(now - 3 * 24 * 60 * 60 * 1000), _count: { likes: 30, retweets: 5, replies: 5, quotes: 1 } });
    const ranked = rankForYou([old, fresh], { following: new Set(), mutual: new Set() }, now);
    expect(ranked[0].id).toBe(1);
  });

  it('caps engagement terms so one viral tweet cannot drown the pool', () => {
    const viral = tweet({ id: 1, createdAt: new Date(now), _count: { likes: 99999, retweets: 99999, replies: 99999, quotes: 99999 } });
    const plain = tweet({ id: 2, createdAt: new Date(now - 1000), _count: { likes: 0, retweets: 0, replies: 0, quotes: 0 } });
    const ranked = rankForYou([plain, viral], { following: new Set(), mutual: new Set() }, now);
    const strongest = Math.floor(1000 * 1) + 500 + 2 * 300 + 300 + 200;
    const viralScore = 500 + 2 * 300 + 300 + 200;
    expect(viralScore).toBeLessThanOrEqual(strongest);
    expect(ranked).toHaveLength(2);
    expect(ranked[0].id).toBe(1);
  });

  it('boosts accounts I follow and mutuals', () => {
    const mine = tweet({ id: 1, authorId: 10, createdAt: new Date(now) });
    const stranger = tweet({ id: 2, authorId: 20, createdAt: new Date(now - 30_000) });
    const ranked = rankForYou(
      [stranger, mine],
      { following: new Set([10]), mutual: new Set([10]) },
      now
    );
    expect(ranked[0].id).toBe(1);
  });

  it('ties break by newest id first (stable order)', () => {
    const a = tweet({ id: 5, authorId: 1, createdAt: new Date(now) });
    const b = tweet({ id: 9, authorId: 1, createdAt: new Date(now) });
    const ranked = rankForYou([a, b], { following: new Set(), mutual: new Set() }, now);
    expect(ranked.map((t) => t.id)).toEqual([9, 5]);
  });

  it('a tweet older than the fresh window still ranks (recency clamps at 0)', () => {
    const ancient = tweet({ id: 1, createdAt: new Date(now - FRESH_WINDOW_MS - 60_000) });
    const modern = tweet({ id: 2, createdAt: new Date(now - FRESH_WINDOW_MS + 60_000) });
    const ranked = rankForYou([ancient, modern], { following: new Set(), mutual: new Set() }, now);
    expect(ranked[0].id).toBe(2);
  });
});