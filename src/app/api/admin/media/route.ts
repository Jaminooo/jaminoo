import { handle, json, requireAdmin } from '@/lib/api';
import { prisma } from '@/lib/prisma';

export const GET = handle(async (req) => {
  await requireAdmin();
  const u = new URL(req.url);
  const q = u.searchParams.get('q')?.trim() ?? '';
  const kind = u.searchParams.get('kind')?.toUpperCase() ?? '';
  const page = Math.max(1, Number(u.searchParams.get('page') ?? 1));
  const per = Math.min(50, Math.max(1, Number(u.searchParams.get('per') ?? 25)));
  const where: any = {};
  if (q) where.OR = [{ filename: { contains: q } }, { user: { username: { contains: q } } }];
  if (kind === 'IMAGE' || kind === 'VOICE') where.kind = kind;
  const [rows, total] = await Promise.all([
    prisma.media.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * per,
      take: per,
      select: {
        id: true,
        kind: true,
        filename: true,
        mime: true,
        size: true,
        createdAt: true,
        userId: true,
        user: { select: { username: true } },
      },
    }),
    prisma.media.count({ where }),
  ]);
  return json({ rows, total, page, per });
});