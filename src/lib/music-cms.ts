import { DEFAULT_ASSETS } from '@/lib/default-assets';

export function coverUrl(kind: 'song' | 'album' | 'artist' | 'playlist', id: number) {
  return `/api/music/cover/${kind}/${id}`;
}

export function streamUrl(songId: number) {
  return `/api/music/stream/${songId}`;
}

export function fallbackMusicCover(seed: number) {
  const picks = [DEFAULT_ASSETS.artist, DEFAULT_ASSETS.album, DEFAULT_ASSETS.playlist, DEFAULT_ASSETS.song];
  return picks[Math.abs(seed) % picks.length];
}

function externalCover(value: string | null | undefined) {
  return !!value && /^https?:\/\//i.test(value);
}

export function safeJsonArr(raw: string | null | undefined): unknown[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export interface SongArgs {
  id: number;
  title: string;
  coverFile?: string | null;
  audioFile?: string | null;
  audioLink?: string | null;
  durationSec?: number;
  genres?: string | null;
  featArtistIds?: string | null;
  lyrics?: string | null;
  lrc?: string | null;
  producer?: string | null;
  label?: string | null;
  year?: number;
  explicit?: boolean;
  featured?: boolean;
  trackNo?: number;
  plays?: number;
  createdAt?: Date;
  artist?: { id: number; name: string; coverFile?: string | null } | null;
  album?: { id: number; title: string; coverFile?: string | null } | null;
}

export function songPayload(s: SongArgs) {
  const feat = safeJsonArr(s.featArtistIds);
  const genres = safeJsonArr(s.genres);
  const albumCover = s.album?.coverFile
    ? externalCover(s.album.coverFile) ? s.album.coverFile : coverUrl('album', s.album.id)
    : fallbackMusicCover(s.album?.id ?? s.id);
  const artistCover = s.artist?.coverFile
    ? externalCover(s.artist.coverFile) ? s.artist.coverFile : coverUrl('artist', s.artist.id)
    : fallbackMusicCover(s.artist?.id ?? s.id);
  return {
    id: s.id,
    title: s.title,
    artist: s.artist ? { id: s.artist.id, name: s.artist.name, coverFile: s.artist.coverFile ?? '', coverUrl: artistCover } : null,
    feat,
    album: s.album ? { id: s.album.id, title: s.album.title, coverUrl: albumCover } : null,
    trackNo: s.trackNo ?? 0,
    durationSec: s.durationSec ?? 0,
    genres,
    producer: s.producer ?? '',
    label: s.label ?? '',
    year: s.year ?? 0,
    explicit: !!s.explicit,
    featured: !!s.featured,
    lyrics: s.lyrics ?? '',
    lrc: s.lrc ?? '',
    hasAudio: !!s.audioFile,
    audioUrl: s.audioFile ? streamUrl(s.id) : null,
    audioLink: s.audioLink || null,
    hasCover: !!s.coverFile || !!albumCover,
    coverUrl: s.coverFile ? (externalCover(s.coverFile) ? s.coverFile : coverUrl('song', s.id)) : albumCover,
    plays: s.plays ?? 0,
    createdAt: s.createdAt?.toISOString() ?? null,
  };
}

export type SongPublic = ReturnType<typeof songPayload>;

export function songAdminPayload(s: SongArgs & { audioFile?: string | null; coverFile?: string | null }) {
  return {
    ...songPayload(s),
    audioFileName: s.audioFile ?? '',
    coverFileName: s.coverFile ?? '',
  };
}
