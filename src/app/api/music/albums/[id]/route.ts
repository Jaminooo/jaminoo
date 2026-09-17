import { handle, err, json, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { songPayload } from '@/lib/music-cms';
import { albumView, demoAlbums, demoSongs } from '@/lib/music-catalog';

type Ctx = { params: { id: string } };

export const GET = handle(async (_req, { params }: Ctx) => {
  await requireUser();
  const id = Number(params.id);
  if (id < 0) {
    const album = demoAlbums.find((item) => item.id === id);
    if (!album) return err('Not found', 404);
    return json({ album, songs: demoSongs.filter((item) => item.album?.id === id) });
  }
  if (!Number.isInteger(id) || id <= 0) return err('Not found', 404);
  const album = await prisma.album.findUnique({
    where: { id },
    include: {
      artist: { select: { id: true, name: true } },
      _count: { select: { songs: true } },
      songs: { include: { artist: { select: { id: true, name: true, coverFile: true } }, album: { select: { id: true, title: true, coverFile: true } } }, orderBy: { trackNo: 'asc' } },
    },
  });
  if (!album) return err('Not found', 404);
  return json({ album: albumView(album), songs: album.songs.map(songPayload) });
});
