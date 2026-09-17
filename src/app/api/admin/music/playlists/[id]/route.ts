import { handle, json, err, requireAdmin } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { songPayload } from '@/lib/music-cms';
import { deleteMusicFile } from '@/lib/music';

type Ctx = { params: { id: string } };

async function withSongs(id: number) {
  return prisma.musicPlaylist.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          song: {
            include: {
              artist: { select: { id: true, name: true, coverFile: true } },
              album: { select: { id: true, title: true, coverFile: true } },
            },
          },
        },
        orderBy: { pos: 'asc' },
      },
    },
  });
}

export const GET = handle(async (_req, { params }: Ctx) => {
  await requireAdmin();
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return err('Not found', 404);
  const pl = await withSongs(id);
  if (!pl) return err('Not found', 404);
  return json({
    playlist: {
      id: pl.id,
      name: pl.name,
      desc: pl.desc,
      coverUrl: pl.coverFile ? `/api/music/cover/playlist/${pl.id}` : null,
      featured: pl.featured,
    },
    songs: pl.items.map((i) => songPayload(i.song)),
  });
});

export const PATCH = handle(async (req, { params }: Ctx) => {
  await requireAdmin();
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return err('Not found', 404);
  const pl = await prisma.musicPlaylist.findUnique({ where: { id } });
  if (!pl) return err('Not found', 404);

  const b = await req.json();
  const base: any = {};
  if (typeof b.name === 'string') {
    const name = b.name.trim();
    if (!name || name.length > 120) return err('Name is required (max 120)');
    base.name = name;
  }
  if (b.desc !== undefined) base.desc = b.desc.toString();
  if (b.featured !== undefined) base.featured = !!b.featured;
  if (b.coverFile !== undefined) {
    if (pl.coverFile && pl.coverFile !== b.coverFile) deleteMusicFile(pl.coverFile);
    base.coverFile = b.coverFile.toString();
  }

  await prisma.$transaction(async (tx) => {
    if (Object.keys(base).length) await tx.musicPlaylist.update({ where: { id }, data: base });
    if (Array.isArray(b.songIds)) {
      const songIds = [...new Set(b.songIds.map((x: unknown) => Number(x)))]
        .filter((sid) => Number.isInteger(sid))
        .map((sid) => sid as number);
      await tx.musicPlaylistSong.deleteMany({ where: { playlistId: id } });
      if (songIds.length) {
        const existing = await tx.song.findMany({ where: { id: { in: songIds } }, select: { id: true } });
        const valid = new Set(existing.map((s) => s.id));
        await tx.musicPlaylistSong.createMany({
          data: songIds.filter((sid) => valid.has(sid)).map((sid, i) => ({ playlistId: id, songId: sid, pos: i + 1 })),
        });
      }
    }
  });

  return json({ ok: true });
});

export const DELETE = handle(async (_req, { params }: Ctx) => {
  await requireAdmin();
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return err('Not found', 404);
  const pl = await prisma.musicPlaylist.findUnique({ where: { id } });
  if (!pl) return err('Not found', 404);
  if (pl.coverFile) deleteMusicFile(pl.coverFile);
  await prisma.musicPlaylist.delete({ where: { id } });
  return json({ ok: true });
});