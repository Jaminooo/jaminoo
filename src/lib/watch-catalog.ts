// Unified "Watch Hub" catalog — merges the Cinema and Anime catalogs into a
// single set of watchable items grouped by content type (MOVIE / SERIES /
// ANIME / CARTOON). Pure functions only: no store, no network, no DOM.

export type WatchSource = 'cinema' | 'anime';
export type WatchKind = 'MOVIE' | 'SERIES' | 'ANIME' | 'CARTOON';
export type WatchTab = 'home' | 'movies' | 'series' | 'anime' | 'cartoons' | 'my-list';

export const WATCH_KINDS: WatchKind[] = ['MOVIE', 'SERIES', 'ANIME', 'CARTOON'];

export interface WatchItem {
  key: string; // `${source}:${id}` — stable id for watchlists & React keys
  source: WatchSource;
  kind: WatchKind; // normalized content type used by the tabs
  title: string;
  subtitle: string; // original title / studio line
  description: string; // synopsis / description
  artworkUrl: string | null;
  trailerUrl: string;
  colorFrom: number;
  colorTo: number;
  rating: number; // 0 when unknown (cinema items have no rating)
  year: number | null;
  genres: string[];
  status: string; // '' for cinema items
  durationSec: number; // 0 when unknown
  episodes: number; // total episode count (0 for cinema items)
  externalId: number; // cinemaVideo.id or anime.id — playback/party target
  slug: string; // anime slug ('' for cinema items)
  mediaUrl: string | null; // direct playable url (cinema items only)
  subtitlesUrl: string | null; // cinema items only
}

// Subset of the `/api/cinema` item shape consumed by the merge.
interface CinemaLike {
  id: number;
  title: string;
  description: string;
  kind: string; // MOVIE | SERIES | CARTOON
  externalUrl: string | null;
  thumbnailUrl: string | null;
  subtitlesUrl: string | null;
  durationSec: number;
}

// Subset of the `/api/anime` item shape consumed by the merge.
interface AnimeLike {
  id: number;
  slug: string;
  title: string;
  original: string;
  overview: string;
  coverUrl: string | null;
  trailerUrl: string;
  type: string; // TV | MOVIE | OVA | SPECIAL
  status: string; // FINISHED | AIRING | UPCOMING
  year: number;
  episodes: number;
  rating: number;
  genres: string[];
  studio: string;
  colorFrom: number;
  colorTo: number;
}

/** Deterministic per-title hue so even cover-less entries look designed. */
export function watchTitleHue(title: string, offset = 0): number {
  let h = 0;
  for (let i = 0; i < title.length; i++) h = (h * 31 + title.charCodeAt(i)) % 360;
  return (h + offset) % 360;
}

/**
 * Map a raw source kind/type onto the unified content types.
 * Cinema: MOVIE | SERIES | CARTOON pass through; anime types fold onto ANIME
 * (TV/OVA/SPECIAL) or MOVIE (movie-type anime). Returns null when unknown.
 */
export function normalizeWatchKind(source: WatchSource, kind: string): WatchKind | null {
  const upper = (kind ?? '').toUpperCase();
  if (source === 'cinema') {
    if (upper === 'MOVIE' || upper === 'SERIES' || upper === 'CARTOON') return upper;
    return null;
  }
  return upper === 'MOVIE' ? 'MOVIE' : 'ANIME';
}

/** The content kinds a catalogue tab shows. */
export function kindsForTab(tab: Exclude<WatchTab, 'home' | 'my-list'>): WatchKind[] {
  switch (tab) {
    case 'movies': return ['MOVIE'];
    case 'series': return ['SERIES'];
    case 'anime': return ['ANIME'];
    case 'cartoons': return ['CARTOON'];
  }
}

export function cinematicItem(item: CinemaLike): WatchItem | null {
  const kind = normalizeWatchKind('cinema', item.kind);
  if (!kind) return null;
  return {
    key: `cinema:${item.id}`,
    source: 'cinema',
    kind,
    title: item.title,
    subtitle: '',
    description: item.description || '',
    artworkUrl: item.thumbnailUrl || null,
    trailerUrl: '',
    colorFrom: watchTitleHue(item.title, 0),
    colorTo: watchTitleHue(item.title, 55),
    rating: 0,
    year: null,
    genres: [],
    status: '',
    durationSec: item.durationSec || 0,
    episodes: 0,
    externalId: item.id,
    slug: '',
    mediaUrl: item.externalUrl || null,
    subtitlesUrl: item.subtitlesUrl || null,
  };
}

export function animeItem(item: AnimeLike): WatchItem {
  const kind = normalizeWatchKind('anime', item.type) ?? 'ANIME';
  return {
    key: `anime:${item.id}`,
    source: 'anime',
    kind,
    title: item.title,
    subtitle: item.original || item.studio || '',
    description: item.overview || '',
    artworkUrl: item.coverUrl || null,
    trailerUrl: item.trailerUrl || '',
    colorFrom: item.colorFrom || 260,
    colorTo: item.colorTo || 330,
    rating: item.rating || 0,
    year: item.year || null,
    genres: Array.isArray(item.genres) ? item.genres : [],
    status: item.status || '',
    durationSec: 0,
    episodes: item.episodes || 0,
    externalId: item.id,
    slug: item.slug || '',
    mediaUrl: null,
    subtitlesUrl: null,
  };
}

/** Merge both catalogues into one list (cinema first, then anime). */
export function mergeWatchCatalog(cinema: CinemaLike[], anime: AnimeLike[]): WatchItem[] {
  const items: WatchItem[] = [];
  for (const c of cinema) {
    const item = cinematicItem(c);
    if (item) items.push(item);
  }
  for (const a of anime) items.push(animeItem(a));
  return items;
}

export interface WatchShelves {
  featured: WatchItem[];
  fresh: WatchItem[];
  updated: WatchItem[];
}

/** Home shelves over the unified catalog, with graceful empty fallbacks. */
export function buildWatchShelves(items: WatchItem[]): WatchShelves {
  const rated = items.filter((i) => i.rating > 0).sort((a, b) => b.rating - a.rating);
  const featured = (rated.length ? rated : items).slice(0, 6);
  const fresh = items.slice(0, 6);
  const airing = items.filter((i) => i.source === 'anime' && i.status === 'AIRING');
  const updated = (airing.length ? airing : items.slice(6, 12)).slice(0, 6);
  return { featured, fresh, updated };
}

/** Catalogue rows for a tab (my-list is resolved by the caller via keys). */
export function filterByWatchTab(items: WatchItem[], tab: WatchTab): WatchItem[] {
  if (tab === 'home' || tab === 'my-list') return items;
  const kinds = kindsForTab(tab);
  return items.filter((i) => kinds.includes(i.kind));
}

/** Client-side search over title / subtitle / description. */
export function matchWatchQuery(item: WatchItem, q: string): boolean {
  const query = q.trim().toLowerCase();
  if (!query) return true;
  return (
    item.title.toLowerCase().includes(query) ||
    item.subtitle.toLowerCase().includes(query) ||
    item.description.toLowerCase().includes(query)
  );
}

export function watchKindCounts(items: WatchItem[]): Record<WatchKind, number> {
  const counts: Record<WatchKind, number> = { MOVIE: 0, SERIES: 0, ANIME: 0, CARTOON: 0 };
  for (const i of items) counts[i.kind] += 1;
  return counts;
}

export interface WatchPartyPlan {
  jamKind: 'MOVIE' | 'ANIME';
  mediaPath: `/api/jams/${string}/cinema` | `/api/jams/${string}/anime`;
  mediaBody: Record<string, unknown>;
}

/**
 * Map a watch item onto the room system: anime items jam as ANIME rooms with
 * an episode loaded; everything else (movies, series, cartoons) jams as MOVIE
 * rooms with the cinema video loaded. Returns null when nothing is playable.
 */
export function watchPartyPlan(item: WatchItem, opts: { jamId: string; episodeId?: number }): WatchPartyPlan | null {
  if (item.kind === 'ANIME') {
    if (!opts.episodeId) return null;
    return {
      jamKind: 'ANIME',
      mediaPath: `/api/jams/${opts.jamId}/anime`,
      mediaBody: { action: 'load', episodeId: opts.episodeId },
    };
  }
  if (!item.mediaUrl) return null;
  return {
    jamKind: 'MOVIE',
    mediaPath: `/api/jams/${opts.jamId}/cinema`,
    mediaBody: { action: 'load', videoId: item.externalId },
  };
}

/** A horizontal Netflix-style rail: one row of titles behind a label. */
export interface WatchRail {
  id: string;
  kind: WatchKind | 'MIXED';
  items: WatchItem[];
}

/**
 * "New anime" and "new film series" rails for the top of the hub. Anime-only
 * items form the anime rail; every cinema item (movies, series, cartoons)
 * forms the film-series rail. Keeps each rail to `limit` entries.
 */
export function buildNewRails(items: WatchItem[], limit = 12): { anime: WatchRail; films: WatchRail } {
  const anime = items.filter((i) => i.source === 'anime').slice(0, limit);
  const films = items.filter((i) => i.source === 'cinema').slice(0, limit);
  return {
    anime: { id: 'new-anime', kind: 'ANIME', items: anime },
    films: { id: 'new-films', kind: 'MIXED', items: films },
  };
}

/**
 * Top genre rails — one rail per genre that actually appears in the catalog,
 * ranked by how many titles it contains. Genres with fewer than `min` titles
 * are dropped; at most `maxRails` rails are returned.
 */
export function buildGenreRails(items: WatchItem[], { min = 2, maxRails = 8, limit = 10 }: { min?: number; maxRails?: number; limit?: number } = {}): WatchRail[] {
  const byGenre = new Map<string, WatchItem[]>();
  for (const item of items) {
    for (const genre of item.genres || []) {
      const list = byGenre.get(genre) ?? [];
      list.push(item);
      byGenre.set(genre, list);
    }
  }
  return [...byGenre.entries()]
    .filter(([, list]) => list.length >= min)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, maxRails)
    .map(([genre, list]) => ({ id: `genre:${genre}`, kind: 'MIXED', items: list.slice(0, limit) }));
}

/** The category rails (film / anime / cartoon) shown below the hero. */
export function buildCategoryRails(items: WatchItem[], limit = 10): WatchRail[] {
  const kinds: WatchKind[] = ['MOVIE', 'ANIME', 'CARTOON'];
  return kinds
    .map((kind) => ({ id: `category:${kind}`, kind, items: items.filter((i) => i.kind === kind).slice(0, limit) }))
    .filter((rail) => rail.items.length > 0);
}

/**
 * Featured items for the hero + mega-menu: the newest titles first, capped at
 * `limit`. Drama-free: when the catalog is empty we return an empty array and
 * the UI falls back to its own placeholder.
 */
export function buildHeroPicks(items: WatchItem[], limit = 6): WatchItem[] {
  return items.slice(0, limit);
}

/**
 * Genre -> title count, ranked by popularity, for the mega-menu genre list.
 * Genres with zero titles (cinema items usually carry no genres) are ignored.
 */
export function genreCounts(items: WatchItem[]): { genre: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    for (const genre of item.genres || []) counts.set(genre, (counts.get(genre) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count || a.genre.localeCompare(b.genre));
}