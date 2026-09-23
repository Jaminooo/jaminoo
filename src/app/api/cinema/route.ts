import { handle, json, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { cinemaPayload } from '@/lib/jam-cinema';

export const GET = handle(async (req) => {
  await requireUser();
  const params = new URL(req.url).searchParams;
  const kind = (params.get('kind') ?? 'ALL').toUpperCase();
  const cursor = Number(params.get('cursor') ?? 0);
  const where: any = { visibility: 'PUBLIC' };
  if (kind === 'MOVIE' || kind === 'SERIES' || kind === 'CARTOON') where.kind = kind;
  if (Number.isInteger(cursor) && cursor > 0) where.id = { lt: cursor };
  const rows = await prisma.cinemaVideo.findMany({ where, orderBy: { id: 'desc' }, take: 25 });
  const hasMore = rows.length === 25;
  const page = hasMore ? rows.slice(0, 24) : rows;
  return json({ items: page.map(cinemaPayload), nextCursor: hasMore ? String(page[page.length - 1].id) : null, hasMore });
});
