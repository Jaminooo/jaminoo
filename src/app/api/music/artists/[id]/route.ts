import { handle, err, json, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { songPayload } from '@/lib/music-cms';
import { albumView, artistView, demoAlbums, demoArtists, demoSongs } from '@/lib/music-catalog';

type Ctx = { params: { id: string } };

export const GET = handle(async (_req, { params }: Ctx) => {
  await requireUser();
  const id = Number(params.id);
  if (id < 0) {
    const artist = demoArtists.find((item) => item.id === id);
    if (!artist) return err('Not found', 404);
    return json({ artist, albums: demoAlbums.filter((item) => item.artist?.id === id), songs: demoSongs.filter((item) => item.artist?.id === id) });
  }
  if (!Number.isInteger(id) || id <= 0) return err('Not found', 404);
  const artist = await prisma.artist.findUnique({
    where: { id },
    include: {
      _count: { select: { songs: true, albums: true } },
      albums: { include: { artist: { select: { id: true, name: true } }, _count: { select: { songs: true } } }, orderBy: { year: 'desc' } },
      songs: { include: { artist: { select: { id: true, name: true, coverFile: true } }, album: { select: { id: true, title: true, coverFile: true } } }, orderBy: [{ featured: 'desc' }, { plays: 'desc' }] },
    },
  });
  if (!artist) return err('Not found', 404);
  return json({ artist: artistView(artist), albums: artist.albums.map((album) => albumView(album)), songs: artist.songs.map(songPayload) });
});
