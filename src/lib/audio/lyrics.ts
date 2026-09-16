export interface LyricWord {
  time: number | null;
  text: string;
}

export interface LyricLine {
  time: number;
  text: string;
  words: LyricWord[];
}

export interface LyricsDoc {
  lines: LyricLine[];
  hasWordTiming: boolean;
}

/**
 * Parse LRC with optional inline word timestamps.
 * Enhanced LRC line format:
 *   [00:12.00] <00:12.00>Hel<00:12.30>lo <00:12.60>world
 */
export function parseLyrics(lrc: string): LyricsDoc {
  const lines: LyricLine[] = [];
  let hasWordTiming = false;

  for (const raw of lrc.split('\n')) {
    const m = raw.match(/^\[(\d+):(\d+(?:\.\d+)?)\](.*)/);
    if (!m) continue;
    const lineTime = Math.floor(parseInt(m[1], 10) * 60000 + parseFloat(m[2]) * 1000);
    const rest = m[3].trim();

    // Check for inline word timestamps: <mm:ss.xx>word
    const wordMatches = [...rest.matchAll(/<(?:(\d+):(\d+(?:\.\d+)?))?>\s*(.*?)(?=\s*<|\s*$)/g)];

    const words: LyricWord[] = [];
    if (wordMatches.length > 0) {
      hasWordTiming = true;
      for (const wm of wordMatches) {
        const wt = wm[1] != null && wm[2] != null
          ? Math.floor(parseInt(wm[1], 10) * 60000 + parseFloat(wm[2]) * 1000)
          : null;
        const txt = wm[3].replace(/\s+/g, ' ').trim();
        if (txt) words.push({ time: wt, text: txt });
      }
    } else {
      // Fall back: entire line text as a single word
      if (rest) words.push({ time: null, text: rest });
    }

    lines.push({ time: lineTime, text: words.map((w) => w.text).join(' '), words });
  }

  return { lines, hasWordTiming };
}

/** Binary search: largest index where line.time <= t, or -1. */
export function activeLineIndex(lines: LyricLine[], t: number): number {
  let lo = 0;
  let hi = lines.length - 1;
  let result = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if (lines[mid].time <= t) {
      result = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return result;
}

/**
 * Returns the index of the last word whose time is <= t (or has time null).
 * If no word has explicit timing, always returns 0.
 */
export function activeWordIndex(line: LyricLine, t: number): number {
  let result = -1;
  for (let i = 0; i < line.words.length; i++) {
    const w = line.words[i];
    if (w.time === null) {
      // Word without explicit time counts only if nothing before it has a time
      if (result === -1) result = i;
      continue;
    }
    if (w.time <= t) {
      result = i;
    }
  }
  return result;
}
