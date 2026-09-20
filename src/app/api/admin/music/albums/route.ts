import { handle, json, err } from '@/lib/api';
import { requireHubAdmin } from '@/lib/roles';
const ADMIN_SCOPE = 'MUSIC';
import { prisma } from '@/lib/prisma';

export const GET = handle(async (req) => {
  await requireHubAdmin(ADMIN_SCOPE);
  const url = new URL(req.url);
  const q = (url.searchParams.get('q') ?? '').trim();
  const artistId = Number(url.searchParams.get('artistId')) || 0;
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
  const per = Math.min(50, Math.max(5, Number(url.searchParams.get('per')) || 25));

  const where: any = q ? { OR: [{ title: { contains: q } }, { artist: { name: { contains: q } } }] } : undefined;
  if (artistId) where.artistId = artistId;

  const [total, rows] = await Promise.all([
    prisma.album.count({ where }),
    prisma.album.findMany({
      where,
      include: {
        artist: { select: { id: true, name: true } },
        _count: { select: { songs: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * per,
      take: per,
    }),
  ]);

  return json({
    rows: rows.map((a) => ({
      id: a.id,
      title: a.title,
      artistId: a.artistId,
      artist: a.artist.name,
      year: a.year,
      type: a.type,
      label: a.label,
      desc: a.desc,
      coverFile: a.coverFile,
      coverUrl: a.coverFile ? `/api/music/cover/album/${a.id}` : null,
      songs: a._count.songs,
    })),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / per)),
  });
});

export const POST = handle(async (req) => {
  await requireHubAdmin(ADMIN_SCOPE);
  const b = await req.json();
  const title = (b.title ?? '').toString().trim();
  const artistId = Number(b.artistId);
  if (!title || title.length > 200) return err('Title is required (max 200)');
  if (!Number.isInteger(artistId) || artistId <= 0) return err('Artist is required');
  const artist = await prisma.artist.findUnique({ where: { id: artistId } });
  if (!artist) return err('Artist not found');

  const album = await prisma.album.create({
    data: {
      title,
      artistId,
      year: Number(b.year) || 0,
      type: (b.type ?? 'ALBUM').toString().toUpperCase().slice(0, 12),
      label: (b.label ?? '').toString(),
      desc: (b.desc ?? '').toString(),
      coverFile: (b.coverFile ?? '').toString(),
    },
  });
  return json({ ok: true, album: { id: album.id, title: album.title } }, 201);
});