import { safeJsonArr } from '@/lib/music-cms';
import { DEFAULT_ASSETS } from '@/lib/default-assets';

const DEMO_COVERS = [
  DEFAULT_ASSETS.artist,
  DEFAULT_ASSETS.album,
  DEFAULT_ASSETS.playlist,
  DEFAULT_ASSETS.song,
  DEFAULT_ASSETS.remix,
];

export function fallbackCover(seed: number | string) {
  const value = typeof seed === 'number' ? Math.abs(seed) : [...seed].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return DEMO_COVERS[value % DEMO_COVERS.length];
}

export function entityCover(kind: 'artist' | 'album' | 'playlist', id: number, file: string | null | undefined) {
  if (file && /^https?:\/\//i.test(file)) return file;
  if (file) return `/api/music/cover/${kind}/${id}`;
  return fallbackCover(`${kind}-${id}`);
}

export function parseGenres(raw: string | null | undefined) {
  return safeJsonArr(raw).filter((item): item is string => typeof item === 'string');
}

export function artistView(artist: any, counts?: { songs?: number; albums?: number }) {
  return {
    id: artist.id,
    name: artist.name,
    coverUrl: entityCover('artist', artist.id, artist.coverFile),
    bio: artist.bio ?? '',
    country: artist.country ?? '',
    genres: parseGenres(artist.genres),
    debutYear: artist.debutYear ?? 0,
    songCount: counts?.songs ?? artist._count?.songs ?? 0,
    albumCount: counts?.albums ?? artist._count?.albums ?? 0,
  };
}

export function albumView(album: any, songCount?: number) {
  return {
    id: album.id,
    title: album.title,
    artist: album.artist ? { id: album.artist.id, name: album.artist.name } : null,
    year: album.year ?? 0,
    type: album.type ?? 'ALBUM',
    label: album.label ?? '',
    desc: album.desc ?? '',
    coverUrl: entityCover('album', album.id, album.coverFile),
    songCount: songCount ?? album._count?.songs ?? album.songs?.length ?? 0,
  };
}

export function playlistView(playlist: any) {
  return {
    id: playlist.id,
    name: playlist.name,
    desc: playlist.desc ?? '',
    coverUrl: entityCover('playlist', playlist.id, playlist.coverFile),
    featured: !!playlist.featured,
    items: (playlist.items ?? []).map((item: any) => ({ id: item.id, pos: item.pos ?? 0, song: item.song })),
  };
}

export const demoArtists = [
  { id: -101, name: 'Neon Atlas', coverUrl: fallbackCover(0), bio: 'A midnight electronic project built for bright rooms and long drives.', country: 'Global', genres: ['Electronic', 'Synthwave'], debutYear: 2024, songCount: 4, albumCount: 2 },
  { id: -102, name: 'Mira Sol', coverUrl: fallbackCover(1), bio: 'Warm vocals, soft percussion and songs that feel like late summer.', country: 'Spain', genres: ['Pop', 'Soul'], debutYear: 2023, songCount: 3, albumCount: 1 },
  { id: -103, name: 'Northbound', coverUrl: fallbackCover(2), bio: 'Indie melodies for the people who keep moving forward.', country: 'Canada', genres: ['Indie', 'Alternative'], debutYear: 2022, songCount: 5, albumCount: 2 },
];

export const demoAlbums = [
  { id: -201, title: 'Afterglow District', artist: { id: -101, name: 'Neon Atlas' }, year: 2026, type: 'ALBUM', label: 'Jamino Selects', desc: 'A neon-lit collection of midnight grooves.', coverUrl: fallbackCover(3), songCount: 4 },
  { id: -202, title: 'Soft Signal', artist: { id: -102, name: 'Mira Sol' }, year: 2025, type: 'EP', label: 'Jamino Selects', desc: 'Small songs with a warm signal.', coverUrl: fallbackCover(4), songCount: 3 },
  { id: -203, title: 'Keep Going', artist: { id: -103, name: 'Northbound' }, year: 2024, type: 'ALBUM', label: 'Independent', desc: 'Open-road indie with a little electricity.', coverUrl: fallbackCover(2), songCount: 5 },
];

export const demoSongs = [
  { id: -301, title: 'City Lights', artist: { id: -101, name: 'Neon Atlas' }, feat: [], album: { id: -201, title: 'Afterglow District', coverUrl: fallbackCover(3) }, durationSec: 214, lyrics: '', lrc: '', audioUrl: null, audioLink: null, coverUrl: fallbackCover(3), featured: true, explicit: false, plays: 12840 },
  { id: -302, title: 'Gold Static', artist: { id: -101, name: 'Neon Atlas' }, feat: [], album: { id: -201, title: 'Afterglow District', coverUrl: fallbackCover(3) }, durationSec: 188, lyrics: '', lrc: '', audioUrl: null, audioLink: null, coverUrl: fallbackCover(3), featured: false, explicit: false, plays: 9820 },
  { id: -303, title: 'Sunroom', artist: { id: -102, name: 'Mira Sol' }, feat: [], album: { id: -202, title: 'Soft Signal', coverUrl: fallbackCover(4) }, durationSec: 201, lyrics: '', lrc: '', audioUrl: null, audioLink: null, coverUrl: fallbackCover(4), featured: true, explicit: false, plays: 11020 },
  { id: -304, title: 'Motion Lines', artist: { id: -103, name: 'Northbound' }, feat: [], album: { id: -203, title: 'Keep Going', coverUrl: fallbackCover(2) }, durationSec: 232, lyrics: '', lrc: '', audioUrl: null, audioLink: null, coverUrl: fallbackCover(2), featured: false, explicit: false, plays: 7640 },
];

export const demoPlaylists = [
  { id: -401, name: 'Late Night Focus', desc: 'A clean, glowing mix for deep work.', coverUrl: fallbackCover(0), featured: true, items: demoSongs.slice(0, 3).map((song, index) => ({ id: -410 - index, pos: index + 1, song })) },
  { id: -402, name: 'Fresh Signals', desc: 'New sounds from the Jamino community.', coverUrl: fallbackCover(4), featured: true, items: demoSongs.slice(1).map((song, index) => ({ id: -420 - index, pos: index + 1, song })) },
];
