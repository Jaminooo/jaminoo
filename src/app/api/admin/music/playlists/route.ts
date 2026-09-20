import { handle, json, err } from '@/lib/api';
import { requireHubAdmin } from '@/lib/roles';
const ADMIN_SCOPE = 'MUSIC';
import { prisma } from '@/lib/prisma';

export const GET = handle(async (req) => {
  await requireHubAdmin(ADMIN_SCOPE);
  const url = new URL(req.url);
  const q = (url.searchParams.get('q') ?? '').trim();
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
  const per = Math.min(50, Math.max(5, Number(url.searchParams.get('per')) || 25));

  const where: any = q ? { OR: [{ name: { contains: q } }, { desc: { contains: q } }] } : undefined;
  const [total, rows] = await Promise.all([
    prisma.musicPlaylist.count({ where }),
    prisma.musicPlaylist.findMany({
      where,
      include: { _count: { select: { items: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * per,
      take: per,
    }),
  ]);

  return json({
    rows: rows.map((p) => ({
      id: p.id,
      name: p.name,
      desc: p.desc,
      coverFile: p.coverFile,
      coverUrl: p.coverFile ? `/api/music/cover/playlist/${p.id}` : null,
      featured: p.featured,
      songs: p._count.items,
    })),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / per)),
  });
});

export const POST = handle(async (req) => {
  await requireHubAdmin(ADMIN_SCOPE);
  const b = await req.json();
  const name = (b.name ?? '').toString().trim();
  if (!name || name.length > 120) return err('Name is required (max 120)');
  const dup = await prisma.musicPlaylist.findUnique({ where: { name } });
  if (dup) return err('Playlist already exists', 409);

  const pl = await prisma.musicPlaylist.create({
    data: {
      name,
      desc: (b.desc ?? '').toString(),
      coverFile: (b.coverFile ?? '').toString(),
      featured: !!b.featured,
    },
  });
  return json({ ok: true, playlist: { id: pl.id, name: pl.name } }, 201);
});