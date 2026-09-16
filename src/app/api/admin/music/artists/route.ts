import { handle, json, err, requireAdmin } from '@/lib/api';
import { prisma } from '@/lib/prisma';

export const GET = handle(async (req) => {
  await requireAdmin();
  const url = new URL(req.url);
  const q = (url.searchParams.get('q') ?? '').trim();
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
  const per = Math.min(50, Math.max(5, Number(url.searchParams.get('per')) || 25));

  const where: any = q ? { OR: [{ name: { contains: q } }, { country: { contains: q } }] } : undefined;
  const [total, rows] = await Promise.all([
    prisma.artist.count({ where }),
    prisma.artist.findMany({
      where,
      include: { _count: { select: { songs: true, albums: true } } },
      orderBy: { name: 'asc' },
      skip: (page - 1) * per,
      take: per,
    }),
  ]);

  return json({
    rows: rows.map((a) => ({
      id: a.id,
      name: a.name,
      coverFile: a.coverFile,
      coverUrl: a.coverFile ? `/api/music/cover/artist/${a.id}` : null,
      bio: a.bio,
      country: a.country,
      genres: JSON.parse(a.genres || '[]'),
      debutYear: a.debutYear,
      songs: a._count.songs,
      albums: a._count.albums,
    })),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / per)),
  });
});

export const POST = handle(async (req) => {
  await requireAdmin();
  const b = await req.json();
  const name = (b.name ?? '').toString().trim();
  if (!name || name.length > 120) return err('Name is required (max 120)');
  const exists = await prisma.artist.findUnique({ where: { name } });
  if (exists) return err('Artist already exists', 409);

  const artist = await prisma.artist.create({
    data: {
      name,
      coverFile: (b.coverFile ?? '').toString(),
      bio: (b.bio ?? '').toString(),
      country: (b.country ?? '').toString(),
      genres: JSON.stringify(Array.isArray(b.genres) ? b.genres : []),
      debutYear: Number(b.debutYear) || 0,
    },
  });

  return json({ ok: true, artist: { id: artist.id, name: artist.name } }, 201);
});