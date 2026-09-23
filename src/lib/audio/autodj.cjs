/**
 * Auto-DJ core — pure logic, CommonJS, shared by server.js and unit tests.
 * (server.js cannot import TS, so the implementation lives here; the TS
 * wrapper re-exports it with types for test consumers.)
 */

/** Total taste weight of the genres a song matches. */
function tasteScore(song, taste) {
  let score = 0;
  for (const g of song.genres) {
    const w = taste[g];
    if (w && w > 0) score += w;
  }
  return score;
}

/**
 * Pick one song. Returns null when there is nothing eligible.
 *
 * Strategy:
 *  1. Drop songs that are queued, currently playing, or played recently.
 *  2. Rank the survivors by (taste score + tiny popularity tiebreaker).
 *  3. Shuffle-scatter: choose semi-randomly from the top `poolSize` so the
 *     radio feels alive instead of replaying the same three tracks.
 */
function pickAutoDjSong(input) {
  const { candidates, taste, recentIds, queueIds, currentSongId, random = Math.random, poolSize = 5 } = input;
  if (!candidates || candidates.length === 0) return null;

  const recent = new Set(recentIds || []);
  const queue = new Set(queueIds || []);

  const eligible = candidates.filter((s) => s.id !== currentSongId && !queue.has(s.id) && !recent.has(s.id));
  if (eligible.length === 0) {
    // Nothing fresh — fall back to anything not currently playing/queued so
    // the room never goes silent.
    const fallback = candidates.filter((s) => s.id !== currentSongId && !queue.has(s.id));
    if (fallback.length === 0) return null;
    return fallback[Math.floor(random() * fallback.length) % fallback.length];
  }

  const ranked = eligible
    .map((song) => ({
      song,
      score: tasteScore(song, taste || {}) + Math.min(1, song.plays / 5000) * 0.01,
    }))
    .sort((a, b) => b.score - a.score || b.song.plays - a.song.plays);

  const pool = ranked.slice(0, Math.max(1, Math.min(poolSize, ranked.length)));
  return pool[Math.floor(random() * pool.length) % pool.length].song;
}

/** Merge two genre maps, adding weights. */
function mergeTaste(base, extra) {
  const out = { ...(base || {}) };
  for (const [genre, weight] of Object.entries(extra || {})) {
    if (!genre) continue;
    out[genre] = (out[genre] || 0) + (Number.isFinite(weight) ? weight : 0);
  }
  return out;
}

/** Sum genre frequencies in a list of songs, as a genre -> weight map. */
function tasteFromSongs(songs, weight = 1) {
  const taste = {};
  for (const song of songs || []) {
    for (const genre of song.genres || []) {
      if (!genre) continue;
      taste[genre] = (taste[genre] || 0) + weight;
    }
  }
  return taste;
}

module.exports = { pickAutoDjSong, mergeTaste, tasteFromSongs };