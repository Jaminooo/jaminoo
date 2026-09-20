import { handle, json, err } from '@/lib/api';
import { requireHubAdmin } from '@/lib/roles';
const ADMIN_SCOPE = 'MUSIC';
import { prisma } from '@/lib/prisma';
import { songPayload } from '@/lib/music-cms';
import { deleteMusicFile } from '@/lib/music';

type Ctx = { params: { id: string } };

export const GET = handle(async (_req, { params }: Ctx) => {
  await requireHubAdmin(ADMIN_SCOPE);
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return err('Not found', 404);
  const album = await prisma.album.findUnique({
    where: { id },
    include: {
      artist: { select: { id: true, name: true } },
      songs: {
        include: {
          artist: { select: { id: true, name: true, coverFile: true } },
          album: { select: { id: true, title: true, coverFile: true } },
        },
        orderBy: { trackNo: 'asc' },
      },
    },
  });
  if (!album) return err('Not found', 404);
  return json({
    album: {
      id: album.id,
      title: album.title,
      artist: album.artist,
      year: album.year,
      type: album.type,
      label: album.label,
      desc: album.desc,
      coverUrl: album.coverFile ? `/api/music/cover/album/${album.id}` : null,
    },
    songs: album.songs.map((s) => songPayload(s)),
  });
});

export const PATCH = handle(async (req, { params }: Ctx) => {
  await requireHubAdmin(ADMIN_SCOPE);
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return err('Not found', 404);
  const album = await prisma.album.findUnique({ where: { id } });
  if (!album) return err('Not found', 404);

  const b = await req.json();
  const data: any = {};
  if (typeof b.title === 'string') {
    const title = b.title.trim();
    if (!title || title.length > 200) return err('Title is required (max 200)');
    data.title = title;
  }
  if (b.artistId !== undefined) {
    const aid = Number(b.artistId);
    const artist = await prisma.artist.findUnique({ where: { id: aid } });
    if (!artist) return err('Artist not found');
    data.artistId = aid;
  }
  if (b.year !== undefined) data.year = Number(b.year) || 0;
  if (b.type !== undefined) data.type = b.type.toString().toUpperCase().slice(0, 12);
  if (b.label !== undefined) data.label = b.label.toString();
  if (b.desc !== undefined) data.desc = b.desc.toString();
  if (b.coverFile !== undefined) {
    if (album.coverFile && album.coverFile !== b.coverFile) deleteMusicFile(album.coverFile);
    data.coverFile = b.coverFile.toString();
  }

  await prisma.album.update({ where: { id }, data });
  return json({ ok: true });
});

export const DELETE = handle(async (_req, { params }: Ctx) => {
  await requireHubAdmin(ADMIN_SCOPE);
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return err('Not found', 404);
  const album = await prisma.album.findUnique({ where: { id } });
  if (!album) return err('Not found', 404);
  if (album.coverFile) deleteMusicFile(album.coverFile);
  await prisma.album.delete({ where: { id } });
  return json({ ok: true });
});