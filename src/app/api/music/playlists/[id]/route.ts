import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';

type Ctx = { params: { id: string } };

export const POST = handle(async (req, { params }) => {
  const me = await requireUser();
  const playlistId = Number(params.id);
  const body = await req.json().catch(() => ({}));
  const songId = Number(body.songId);
  if (!Number.isInteger(playlistId) || !Number.isInteger(songId) || playlistId <= 0 || songId <= 0) return err('Invalid playlist or song');
  const playlist = await prisma.userMusicPlaylist.findFirst({ where: { id: playlistId, userId: me.id }, select: { id: true } });
  if (!playlist) return err('Playlist not found', 404);
  const song = await prisma.song.findUnique({ where: { id: songId }, select: { id: true } });
  if (!song) return err('Song not found', 404);
  const max = await prisma.userMusicPlaylistItem.aggregate({ where: { playlistId }, _max: { pos: true } });
  await prisma.userMusicPlaylistItem.upsert({
    where: { playlistId_songId: { playlistId, songId } },
    create: { playlistId, songId, pos: (max._max.pos ?? 0) + 1 },
    update: {},
  });
  return json({ added: true });
});

export const DELETE = handle(async (req, { params }) => {
  const me = await requireUser();
  const playlistId = Number(params.id);
  const body = await req.json().catch(() => ({}));
  const songId = Number(body.songId);
  if (!Number.isInteger(playlistId) || !Number.isInteger(songId)) return err('Invalid playlist or song');
  const playlist = await prisma.userMusicPlaylist.findFirst({ where: { id: playlistId, userId: me.id }, select: { id: true } });
  if (!playlist) return err('Playlist not found', 404);
  await prisma.userMusicPlaylistItem.deleteMany({ where: { playlistId, songId } });
  return json({ removed: true });
});
