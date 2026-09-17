import { handle, json, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { songPayload } from '@/lib/music-cms';
import { albumView, artistView, demoAlbums, demoArtists, demoPlaylists, demoSongs, entityCover, fallbackCover, playlistView } from '@/lib/music-catalog';

export const GET = handle(async () => {
  await requireUser();
  const [songs, singleSongs, artists, albums, playlists, publicUserPlaylists] = await Promise.all([
    prisma.song.findMany({
      include: {
        artist: { select: { id: true, name: true, coverFile: true } },
        album: { select: { id: true, title: true, coverFile: true } },
      },
      orderBy: [{ featured: 'desc' }, { plays: 'desc' }, { createdAt: 'desc' }],
      take: 32,
    }),
    prisma.song.findMany({
      where: { OR: [{ albumId: null }, { album: { type: 'SINGLE' } }] },
      include: {
        artist: { select: { id: true, name: true, coverFile: true } },
        album: { select: { id: true, title: true, coverFile: true } },
      },
      orderBy: [{ featured: 'desc' }, { plays: 'desc' }, { createdAt: 'desc' }],
      take: 32,
    }),
    prisma.artist.findMany({ include: { _count: { select: { songs: true, albums: true } } }, orderBy: { name: 'asc' }, take: 32 }),
    prisma.album.findMany({ include: { artist: { select: { id: true, name: true } }, _count: { select: { songs: true } } }, orderBy: { createdAt: 'desc' }, take: 32 }),
    prisma.musicPlaylist.findMany({
      include: {
        items: {
          include: {
            song: { include: { artist: { select: { id: true, name: true, coverFile: true } }, album: { select: { id: true, title: true, coverFile: true } } } },
          },
          orderBy: { pos: 'asc' },
          take: 20,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 16,
    }),
    prisma.userMusicPlaylist.findMany({
      where: { isPublic: true },
      include: {
        user: { select: { id: true, username: true } },
        items: {
          include: {
            song: { include: { artist: { select: { id: true, name: true, coverFile: true } }, album: { select: { id: true, title: true, coverFile: true } } } },
          },
          orderBy: { pos: 'asc' },
          take: 20,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 24,
    }),
  ]);

  const publicSongs = songs.map(songPayload);
  const publicArtists = artists.map((artist) => artistView(artist));
  const publicAlbums = albums.map((album) => albumView(album));
  const curatedPlaylists = playlists.map((playlist) => ({ ...playlistView(playlist), source: 'curated' as const, items: playlist.items.map((item) => ({ ...item, song: songPayload(item.song) })) }));
  const publicPlaylists = publicUserPlaylists.map((playlist) => ({
    id: 100000000 + playlist.id,
    name: playlist.name,
    desc: playlist.desc,
    coverUrl: entityCover('playlist', playlist.id, null) || fallbackCover(playlist.id),
    featured: false,
    source: 'community' as const,
    owner: playlist.user,
    items: playlist.items.map((item) => ({ id: item.id, pos: item.pos, song: songPayload(item.song) })),
  }));
  const singles = singleSongs.map(songPayload);

  return json({
    songs: publicSongs.length ? publicSongs : demoSongs,
    singles: singles.length ? singles : demoSongs.slice(0, 2),
    artists: publicArtists.length ? publicArtists : demoArtists,
    albums: publicAlbums.length ? publicAlbums : demoAlbums,
    playlists: [...curatedPlaylists, ...publicPlaylists].length ? [...curatedPlaylists, ...publicPlaylists] : demoPlaylists,
  });
});
