import { handle, err, json, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { songPayload } from '@/lib/music-cms';
import { demoSongs } from '@/lib/music-catalog';

type Ctx = { params: { id: string } };

export const GET = handle(async (_req, { params }: Ctx) => {
  await requireUser();
  const id = Number(params.id);
  if (id < 0) {
    const song = demoSongs.find((item) => item.id === id);
    return song ? json({ song }) : err('Not found', 404);
  }
  if (!Number.isInteger(id) || id <= 0) return err('Not found', 404);
  const song = await prisma.song.findUnique({ where: { id }, include: { artist: { select: { id: true, name: true, coverFile: true } }, album: { select: { id: true, title: true, coverFile: true } } } });
  if (!song) return err('Not found', 404);
  return json({ song: songPayload(song) });
});
