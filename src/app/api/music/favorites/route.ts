import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { songPayload } from '@/lib/music-cms';

export const GET = handle(async () => {
  const me = await requireUser();
  const rows = await prisma.songFavorite.findMany({
    where: { userId: me.id },
    orderBy: { createdAt: 'desc' },
    select: { songId: true, createdAt: true, song: { include: { artist: true, album: true } } },
  });
  return json({ favorites: rows.map((row) => ({ songId: row.songId, createdAt: row.createdAt.toISOString(), song: songPayload(row.song) })) });
});

export const POST = handle(async (req) => {
  const me = await requireUser();
  const body = await req.json().catch(() => ({}));
  const songId = Number(body.songId);
  if (!Number.isInteger(songId) || songId <= 0) return err('Invalid song');
  const song = await prisma.song.findUnique({ where: { id: songId }, select: { id: true } });
  if (!song) return err('Song not found', 404);
  await prisma.songFavorite.upsert({
    where: { userId_songId: { userId: me.id, songId } },
    create: { userId: me.id, songId },
    update: {},
  });
  return json({ favorite: true });
});

export const DELETE = handle(async (req) => {
  const me = await requireUser();
  const body = await req.json().catch(() => ({}));
  const songId = Number(body.songId);
  if (!Number.isInteger(songId) || songId <= 0) return err('Invalid song');
  await prisma.songFavorite.deleteMany({ where: { userId: me.id, songId } });
  return json({ favorite: false });
});
