import { handle, json, requireAdmin } from '@/lib/api';
import { prisma } from '@/lib/prisma';

export const GET = handle(async (req) => {
  await requireAdmin();
  const u = new URL(req.url);
  const q = u.searchParams.get('q')?.trim() ?? '';
  const page = Math.max(1, Number(u.searchParams.get('page') ?? 1));
  const per = Math.min(50, Math.max(1, Number(u.searchParams.get('per') ?? 25)));
  const where = q
    ? { OR: [{ username: { contains: q } }, { email: { contains: q } }, { bio: { contains: q } }] }
    : {};
  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * per,
      take: per,
      select: {
        id: true,
        username: true,
        email: true,
        github: true,
        avatarId: true,
        profilePhotoId: true,
        status: true,
        isAdmin: true,
        bannedUntil: true,
        bannedReason: true,
        createdAt: true,
        _count: { select: { jams: true, messages: true, dmMessages: true, media: true, sessions: true, reactions: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);
  return json({ rows, total, page, per });
});