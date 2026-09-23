import { parseQualitySources, type QualitySources } from '@/lib/watch-select';
export const ANIME_TYPES = ['TV', 'MOVIE', 'OVA', 'SPECIAL'] as const;
export const ANIME_STATUSES = ['FINISHED', 'AIRING', 'UPCOMING'] as const;
export const HUB_SCOPE = ['MUSIC', 'VIDEO', 'ANIME', 'CINEMA', 'TWEET', 'COMMUNITY'] as const;

export function parseGenres(value: string | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((g): g is string => typeof g === 'string') : [];
  } catch {
    return [];
  }
}

export function genresToJSON(genres: string[]): string {
  return JSON.stringify(genres);
}

export function animeCoverUrl(anime: { coverFile: string }): string | null {
  if (anime.coverFile) return anime.coverFile;
  return null;
}

export interface AnimePayload {
  id: number;
  slug: string;
  title: string;
  original: string;
  overview: string;
  coverUrl: string | null;
  trailerUrl: string;
  type: string;
  status: string;
  year: number;
  episodes: number;
  rating: number;
  genres: string[];
  studio: string;
  colorFrom: number;
  colorTo: number;
}

export function animePayload(anime: any): AnimePayload {
  return {
    id: anime.id,
    slug: anime.slug,
    title: anime.title,
    original: anime.original,
    overview: anime.overview,
    coverUrl: animeCoverUrl(anime),
    trailerUrl: anime.trailerUrl,
    type: anime.type,
    status: anime.status,
    year: anime.year,
    episodes: anime.episodes,
    rating: anime.rating,
    genres: parseGenres(anime.genres),
    studio: anime.studio,
    colorFrom: anime.colorFrom,
    colorTo: anime.colorTo,
  };
}

export interface AnimeEpisodePayload {
  id: number;
  animeId: number;
  season: number;
  title: string;
  number: number;
  slug: string;
  externalUrl: string | null;
  qualitySources: QualitySources;
  thumbnailUrl: string | null;
  subtitlesUrl: string | null;
  durationSec: number;
}

export function animeEpisodePayload(episode: any): AnimeEpisodePayload {
  return {
    id: episode.id,
    animeId: episode.animeId,
    season: episode.season || 1,
    title: episode.title,
    number: episode.number,
    slug: episode.slug,
    externalUrl: episode.externalUrl || null,
    qualitySources: parseQualitySources(episode.qualitySources),
    thumbnailUrl: episode.thumbnailUrl || null,
    subtitlesUrl: episode.subtitlesUrl || null,
    durationSec: episode.durationSec,
  };
}
