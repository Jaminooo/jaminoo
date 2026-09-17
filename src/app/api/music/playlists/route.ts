import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';

export const GET = handle(async () => {
  const me = await requireUser();
  const playlists = await prisma.userMusicPlaylist.findMany({
    where: { userId: me.id },
    orderBy: { createdAt: 'desc' },
    include: { items: { orderBy: { pos: 'asc' }, include: { song: { include: { artist: true, album: true } } } } },
  });
  return json({ playlists });
});

export const POST = handle(async (req) => {
  const me = await requireUser();
  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 80) : '';
  const desc = typeof body.desc === 'string' ? body.desc.trim().slice(0, 240) : '';
  if (!name) return err('Playlist name is required');
  const exists = await prisma.userMusicPlaylist.findUnique({ where: { userId_name: { userId: me.id, name } }, select: { id: true } });
  if (exists) return err('Playlist already exists', 409);
  const playlist = await prisma.userMusicPlaylist.create({ data: { userId: me.id, name, desc } });
  return json({ playlist }, 201);
});
