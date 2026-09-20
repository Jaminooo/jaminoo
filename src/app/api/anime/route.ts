import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { animePayload } from '@/lib/anime';

function safeParam(value: string | null, fallback = '') {
  return value ? value.slice(0, 120) : fallback;
}

export const GET = handle(async (req) => {
  await requireUser();
  const params = new URL(req.url).searchParams;
  const q = safeParam(params.get('q'));
  const genre = safeParam(params.get('genre'));
  const type = params.get('type')?.toUpperCase();
  const status = params.get('status')?.toUpperCase();
  const sort = params.get('sort')?.toLowerCase() || 'latest';
  const cursor = Number(params.get('cursor')) || 0;
  const featured = params.get('featured') === '1';

  const where: any = { visibility: 'PUBLIC' };
  if (q) {
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { original: { contains: q, mode: 'insensitive' } },
      { studio: { contains: q, mode: 'insensitive' } },
    ];
  }
  if (genre) where.genres = { equals: genresToFilter(genre) };
  if (type) where.type = type;
  if (status) where.status = status;
  if (cursor) where.id = { lt: cursor };

  let orderBy: any = [{ id: 'desc' }];
  if (featured || sort === 'rating' || sort === 'popular') orderBy = [{ rating: 'desc' }, { id: 'desc' }];
  else if (sort === 'year') orderBy = [{ year: 'desc' }, { id: 'desc' }];
  else if (sort === 'airing') orderBy = [{ status: 'asc' }, { id: 'desc' }];

  const rows = await prisma.anime.findMany({ where, orderBy, take: 24 });
  const hasMore = rows.length === 24;
  const page = hasMore ? rows.slice(0, 23) : rows;
  return json({ items: page.map(animePayload), nextCursor: hasMore ? page[page.length - 1].id : null, hasMore });
});

function genresToFilter(genre: string) {
  return JSON.stringify([genre]);
}
