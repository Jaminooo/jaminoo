/**
 * Auto-DJ: pick the next song for a music jam when its queue is empty.
 *
 * Pure logic — no DB, no IO. The server collects candidate songs and the
 * members' collective taste (genre -> weight, e.g. built from play history and
 * favorites), then delegates the ranking/selection decision here so it stays
 * unit-testable.
 *
 * The implementation lives in autodj.cjs (server.js is CommonJS and cannot
 * import TS); this module re-exports it with types for test consumers.
 */

const core = require('./autodj.cjs');

export interface AutoDjSong {
  id: number;
  title: string;
  artistId: number;
  genres: string[];
  durationSec: number;
  plays: number;
  featured: boolean;
}

export interface AutoDjInput {
  /** Every playable song the recommender may pick from. */
  candidates: AutoDjSong[];
  /** Genre -> weight reflecting what the room's members like. May be empty. */
  taste: Record<string, number>;
  /** Song ids played recently in this jam — avoided to keep things fresh. */
  recentIds: number[];
  /** Song ids currently sitting in the queue (don't also auto-play them). */
  queueIds: number[];
  /** The song playing right now (skip a straight repeat). */
  currentSongId: number | null;
  /** Injectable RNG for deterministic tests. Defaults to Math.random. */
  random?: () => number;
  /** How many candidates the selector pool draws from (variety vs. taste). */
  poolSize?: number;
}

export const pickAutoDjSong: (input: AutoDjInput) => AutoDjSong | null = core.pickAutoDjSong;
export const mergeTaste: (base: Record<string, number>, extra: Record<string, number>) => Record<string, number> = core.mergeTaste;
export const tasteFromSongs: (songs: { genres: string[] }[], weight?: number) => Record<string, number> = core.tasteFromSongs;