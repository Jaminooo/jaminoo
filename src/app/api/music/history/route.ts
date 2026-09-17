import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { songPayload } from '@/lib/music-cms';

export const GET = handle(async () => {
  const me = await requireUser();
  const rows = await prisma.songPlayHistory.findMany({
    where: { userId: me.id },
    orderBy: { playedAt: 'desc' },
    take: 100,
    include: { song: { include: { artist: true, album: true } } },
  });
  return json({ history: rows.map((row) => ({ id: row.id, playedAt: row.playedAt.toISOString(), song: songPayload(row.song) })) });
});

export const POST = handle(async (req) => {
  const me = await requireUser();
  const body = await req.json().catch(() => ({}));
  const songId = Number(body.songId);
  const jamId = typeof body.jamId === 'string' && body.jamId.length < 80 ? body.jamId : null;
  if (!Number.isInteger(songId) || songId <= 0) return err('Invalid song');
  const song = await prisma.song.findUnique({ where: { id: songId }, select: { id: true } });
  if (!song) return err('Song not found', 404);
  const recent = await prisma.songPlayHistory.findFirst({
    where: { userId: me.id, songId, playedAt: { gt: new Date(Date.now() - 30_000) } },
    select: { id: true },
  });
  if (!recent) await prisma.songPlayHistory.create({ data: { userId: me.id, songId, jamId } });
  return json({ recorded: !recent });
});
