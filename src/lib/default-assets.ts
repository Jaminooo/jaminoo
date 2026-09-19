import path from 'path';

const PA = (p: string) => path.join(process.cwd(), 'public', 'defaults', p);

// Public URLs (survive deploys because they live in /public and are committed).
export const DEFAULT_ASSETS = {
  artist: '/defaults/images/artist.png',
  album: '/defaults/images/album.png',
  playlist: '/defaults/images/playlist.png',
  song: '/defaults/images/song.png',
  remix: '/defaults/images/remix.png',
  media: '/defaults/images/media.png',
  movie: '/defaults/images/movie.png',
  video: '/defaults/images/video.png',
  profile: '/defaults/images/profile.png',
  postPicture: '/defaults/images/post-picture.png',
  audio: '/defaults/audio/demo.mp3',
  videoContent: '/defaults/videos/demo.mp4',
} as const;

// Filesystem paths used to stream/fallback when an uploaded file is missing.
export const DEFAULT_FILE_PATHS = {
  artist: PA('images/artist.png'),
  album: PA('images/album.png'),
  playlist: PA('images/playlist.png'),
  song: PA('images/song.png'),
  remix: PA('images/remix.png'),
  media: PA('images/media.png'),
  movie: PA('images/movie.png'),
  video: PA('images/video.png'),
  profile: PA('images/profile.png'),
  postPicture: PA('images/post-picture.png'),
  audio: PA('audio/demo.mp3'),
  videoContent: PA('videos/demo.mp4'),
} as const;

export type MusicCoverKind = 'song' | 'album' | 'artist' | 'playlist';

export const COVER_KIND_DEFAULT: Record<MusicCoverKind, string> = {
  song: DEFAULT_FILE_PATHS.song,
  album: DEFAULT_FILE_PATHS.album,
  artist: DEFAULT_FILE_PATHS.artist,
  playlist: DEFAULT_FILE_PATHS.playlist,
};

export const COVER_KIND_MIME: Record<MusicCoverKind, string> = {
  song: 'image/png',
  album: 'image/png',
  artist: 'image/png',
  playlist: 'image/png',
};