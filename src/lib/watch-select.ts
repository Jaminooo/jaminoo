// Pure helpers for the dedicated watch-theater page.
// No store, no network, no DOM — only deterministic selection logic.

export const DEMO_VIDEO_URL = '/defaults/videos/demo.mp4';

export const WATCH_QUALITIES = ['auto', '720p', '1080p', '2160p'] as const;
export type WatchQuality = (typeof WATCH_QUALITIES)[number];
export const WATCH_QUALITY_VARIANTS = ['720p', '1080p', '2160p'] as const;
export type QualitySources = Partial<Record<(typeof WATCH_QUALITY_VARIANTS)[number], string>>;

const SAFE_LOCAL_MEDIA = /^\/(?:api\/media\/[A-Za-z0-9_-]+|defaults\/videos\/demo\.mp4)$/;

export const DEFAULT_QUALITY: WatchQuality = 'auto';

export function parseQualitySources(value: unknown): QualitySources {
  let candidate = value;
  if (typeof candidate === 'string') {
    try { candidate = JSON.parse(candidate); } catch { return {}; }
  }
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return {};
  const result: QualitySources = {};
  for (const quality of WATCH_QUALITY_VARIANTS) {
    const source = (candidate as Record<string, unknown>)[quality];
    if (typeof source !== 'string' || !source.trim()) continue;
    const url = source.trim().slice(0, 1800);
    if (SAFE_LOCAL_MEDIA.test(url)) result[quality] = url;
    else {
      try {
        const parsed = new URL(url);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') result[quality] = url;
      } catch { /* Ignore invalid quality URLs. */ }
    }
  }
  return result;
}

export function availableWatchQualities(sources: unknown): WatchQuality[] {
  const parsed = parseQualitySources(sources);
  return ['auto', ...WATCH_QUALITY_VARIANTS.filter((quality) => Boolean(parsed[quality]))];
}

export function resolveWatchSource(fallback: string | null | undefined, sources: unknown, quality: WatchQuality): string {
  const parsed = parseQualitySources(sources);
  if (quality !== 'auto' && parsed[quality]) return parsed[quality]!;
  return fallback && fallback.trim() ? fallback : DEMO_VIDEO_URL;
}

export interface WatchSelectEpisode {
  id: number;
  number: number;
  season: number;
  title: string;
  externalUrl: string | null;
  qualitySources?: QualitySources;
  subtitlesUrl?: string | null;
  thumbnailUrl: string | null;}

export interface RelatedCandidate {
  key: string;
  title: string;
  source: string;
  kind: string;
  genres: string[];
  rating: number;
  slug: string;
}

export interface SeasonGroup {
  season: number;
  episodes: WatchSelectEpisode[];
}

/** Pick a playable url, falling back to the bundled demo video. */
export function episodePlayUrl(ep: Pick<WatchSelectEpisode, 'externalUrl'> | null | undefined): string {
  return ep?.externalUrl && ep.externalUrl.trim() ? ep.externalUrl : DEMO_VIDEO_URL;
}

/** Pick a playable url for a standalone title (movies / series without episodes). */
export function titlePlayUrl(externalUrl: string | null | undefined): string {
  return externalUrl && externalUrl.trim() ? externalUrl : DEMO_VIDEO_URL;
}

/**
 * Group episodes by their season, each season sorted by episode number and
 * seasons ascending. Episodes with no/invalid season fall back to season 1.
 */
export function groupEpisodesBySeason(episodes: WatchSelectEpisode[]): SeasonGroup[] {
  const map = new Map<number, WatchSelectEpisode[]>();
  for (const ep of episodes) {
    const season = Number.isFinite(ep.season) && ep.season > 0 ? ep.season : 1;
    if (!map.has(season)) map.set(season, []);
    map.get(season)!.push(ep);
  }
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([season, eps]) => ({ season, episodes: [...eps].sort((a, b) => a.number - b.number) }));
}

/**
 * Related titles: other ANIME entries (films excluded — "related anime, not
 * films") that share at least one genre, ranked by genre overlap then rating.
 * Returns at most `limit` results.
 */
export function relatedTitles(
  item: { key: string; genres: string[] },
  all: RelatedCandidate[],
  limit = 8
): RelatedCandidate[] {
  const myGenres = new Set((item.genres || []).map((g) => g.toLowerCase()));
  if (myGenres.size === 0) return [];
  const scored: { item: RelatedCandidate; score: number }[] = [];
  for (const cand of all) {
    if (cand.key === item.key) continue;
    if (cand.source !== 'anime') continue;
    if (cand.kind === 'MOVIE') continue;
    const score = (cand.genres || []).reduce((sum, g) => sum + (myGenres.has(g.toLowerCase()) ? 1 : 0), 0);
    if (score > 0) scored.push({ item: cand, score });
  }
  scored.sort((a, b) => b.score - a.score || (b.item.rating || 0) - (a.item.rating || 0));
  return scored.slice(0, limit).map((s) => s.item);
}