import { handle, json, requireAdmin } from '@/lib/api';
import { prisma } from '@/lib/prisma';

export const GET = handle(async (req) => {
  await requireAdmin();
  const u = new URL(req.url);
  const kind = u.searchParams.get('kind') ?? '';
  const q = u.searchParams.get('q')?.trim() ?? '';
  const page = Math.max(1, Number(u.searchParams.get('page') ?? 1));
  const per = Math.min(50, Math.max(1, Number(u.searchParams.get('per') ?? 25)));

  if (kind === 'dm') {
    const whereDm: any = {};
    if (q) whereDm.OR = [{ text: { contains: q } }, { sender: { username: { contains: q } } }];
    const [rows, total] = await Promise.all([
      prisma.dmMessage.findMany({
        where: whereDm,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * per,
        take: per,
        select: {
          id: true,
          kind: true,
          text: true,
          mediaId: true,
          seenAt: true,
          createdAt: true,
          sender: { select: { id: true, username: true } },
          conv: {
            select: {
              userA_ref: { select: { id: true, username: true } },
              userB_ref: { select: { id: true, username: true } },
            },
          },
          _count: { select: { reactions: true } },
        },
      }),
      prisma.dmMessage.count({ where: whereDm }),
    ]);
    const list = rows.map((r) => ({
      key: `d${r.id}`,
      kind: 'dm',
      id: r.id,
      type: r.kind,
      text: r.text,
      mediaId: r.mediaId,
      seen: !!r.seenAt,
      createdAt: r.createdAt,
      senderId: r.sender.id,
      sender: r.sender.username,
      target: `@${r.conv.userA_ref.username} ↔ @${r.conv.userB_ref.username}`,
      reactions: r._count.reactions,
    }));
    return json({ rows: list, total, page, per });
  }

  const whereJam: any = {};
  if (q) whereJam.OR = [{ text: { contains: q } }, { user: { username: { contains: q } } }];
  const [rowsJ, totalJ] = await Promise.all([
    prisma.jamMessage.findMany({
      where: whereJam,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * per,
      take: per,
      select: {
        id: true,
        kind: true,
        text: true,
        mediaId: true,
        createdAt: true,
        user: { select: { id: true, username: true } },
        jam: { select: { id: true, name: true } },
        _count: { select: { reactions: true } },
      },
    }),
    prisma.jamMessage.count({ where: whereJam }),
  ]);
  const list = rowsJ.map((r) => ({
    key: `j${r.id}`,
    kind: 'jam',
    id: r.id,
    type: r.kind,
    text: r.text,
    mediaId: r.mediaId,
    createdAt: r.createdAt,
    senderId: r.user.id,
    sender: r.user.username,
    target: `${r.jam.name} (${r.jam.id})`,
    reactions: r._count.reactions,
  }));
  return json({ rows: list, total: totalJ, page, per });
});