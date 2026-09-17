import { handle, json, err, requireAdmin } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { deleteMusicFile } from '@/lib/music';

type Ctx = { params: { id: string } };

export const PATCH = handle(async (req, { params }: Ctx) => {
  await requireAdmin();
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return err('Not found', 404);
  const artist = await prisma.artist.findUnique({ where: { id } });
  if (!artist) return err('Not found', 404);

  const b = await req.json();
  const data: any = {};
  if (typeof b.name === 'string') {
    const name = b.name.trim();
    if (!name || name.length > 120) return err('Name is required (max 120)');
    const dup = await prisma.artist.findUnique({ where: { name } });
    if (dup && dup.id !== id) return err('Artist already exists', 409);
    data.name = name;
  }
  if (b.coverFile !== undefined) {
    if (artist.coverFile && artist.coverFile !== b.coverFile) deleteMusicFile(artist.coverFile);
    data.coverFile = b.coverFile.toString();
  }
  if (b.bio !== undefined) data.bio = b.bio.toString();
  if (b.country !== undefined) data.country = b.country.toString();
  if (b.genres !== undefined) data.genres = JSON.stringify(Array.isArray(b.genres) ? b.genres : []);
  if (b.debutYear !== undefined) data.debutYear = Number(b.debutYear) || 0;

  await prisma.artist.update({ where: { id }, data });
  return json({ ok: true });
});

export const DELETE = handle(async (_req, { params }: Ctx) => {
  await requireAdmin();
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return err('Not found', 404);

  const songs = await prisma.song.findMany({ where: { artistId: id }, select: { audioFile: true, coverFile: true, id: true } });
  for (const s of songs) {
    if (s.audioFile) deleteMusicFile(s.audioFile);
    if (s.coverFile) deleteMusicFile(s.coverFile);
  }
  await prisma.song.deleteMany({ where: { artistId: id } });

  const artist = await prisma.artist.findUnique({ where: { id }, select: { coverFile: true } });
  if (artist?.coverFile) deleteMusicFile(artist.coverFile);
  await prisma.artist.delete({ where: { id } });

  return json({ ok: true, songsDeleted: songs.length });
});