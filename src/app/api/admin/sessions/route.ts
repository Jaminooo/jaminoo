import { handle, json, requireAdmin } from '@/lib/api';
import { prisma } from '@/lib/prisma';

export const GET = handle(async (req) => {
  await requireAdmin();
  const u = new URL(req.url);
  const q = u.searchParams.get('q')?.trim() ?? '';
  const page = Math.max(1, Number(u.searchParams.get('page') ?? 1));
  const per = Math.min(50, Math.max(1, Number(u.searchParams.get('per') ?? 25)));
  const where = q
    ? { user: { username: { contains: q } } }
    : {};
  const [rows, total] = await Promise.all([
    prisma.session.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * per,
      take: per,
      select: {
        token: true,
        name: true,
        device: true,
        createdAt: true,
        expiresAt: true,
        userId: true,
        user: { select: { username: true, isAdmin: true } },
      },
    }),
    prisma.session.count({ where }),
  ]);
  const list = rows.map((r) => ({
    token: r.token,
    suffix: r.token.slice(-6),
    name: r.name,
    device: r.device,
    createdAt: r.createdAt,
    expiresAt: r.expiresAt,
    userId: r.userId,
    username: r.user.username,
  }));
  return json({ rows: list, total, page, per });
});