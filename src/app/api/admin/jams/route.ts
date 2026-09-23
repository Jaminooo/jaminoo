import { handle, json, requireAdmin } from '@/lib/api';
import { prisma } from '@/lib/prisma';

export const GET = handle(async (req) => {
  await requireAdmin();
  const u = new URL(req.url);
  const q = u.searchParams.get('q')?.trim() ?? '';
  const kind = u.searchParams.get('kind')?.toUpperCase() ?? '';
  const type = u.searchParams.get('type')?.toUpperCase() ?? '';
  const state = u.searchParams.get('state') ?? '';
  const page = Math.max(1, Number(u.searchParams.get('page') ?? 1));
  const per = Math.min(50, Math.max(1, Number(u.searchParams.get('per') ?? 25)));
  const where: any = {};
  if (q) where.OR = [{ name: { contains: q } }, { desc: { contains: q } }, { id: { contains: q } }];
  if (kind === 'CHAT' || kind === 'MOVIE' || kind === 'MUSIC' || kind === 'HANGOUT' || kind === 'ANIME') where.kind = kind;
  if (type === 'PUBLIC' || type === 'PRIVATE') where.type = type;
  if (state === 'open') where.closed = false;
  if (state === 'closed') where.closed = true;
  const [rows, total] = await Promise.all([
    prisma.jam.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * per,
      take: per,
      select: {
        id: true,
        name: true,
        desc: true,
        kind: true,
        type: true,
        closed: true,
        createdAt: true,
        ownerId: true,
        owner: { select: { username: true } },
        _count: { select: { members: true, messages: true, invites: true } },
      },
    }),
    prisma.jam.count({ where }),
  ]);
  return json({ rows, total, page, per });
});