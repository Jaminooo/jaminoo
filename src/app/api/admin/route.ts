import { handle, json, err, requireAdmin } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { recentAdminEvents } from '@/lib/admin';

export const GET = handle(async () => {
  await requireAdmin();
  const dayAgo = new Date(Date.now() - 86400000);
  const now = new Date();
  const [
    users,
    jams,
    openJams,
    jamMsgs,
    dmMsgs,
    media,
    sessions,
    friends,
    pendingInvites,
    banned,
    newUsers24h,
    jamMsgs24h,
    dmMsgs24h,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.jam.count(),
    prisma.jam.count({ where: { closed: false } }),
    prisma.jamMessage.count(),
    prisma.dmMessage.count(),
    prisma.media.count(),
    prisma.session.count(),
    prisma.friendRequest.count({ where: { status: 'FRIENDS' } }),
    prisma.jamInvite.count({ where: { status: 'PENDING' } }),
    prisma.user.count({ where: { bannedUntil: { gt: now } } }),
    prisma.user.count({ where: { createdAt: { gte: dayAgo } } }),
    prisma.jamMessage.count({ where: { createdAt: { gte: dayAgo } } }),
    prisma.dmMessage.count({ where: { createdAt: { gte: dayAgo } } }),
  ]);
  const online = (globalThis as any).__jaminoLive?.online?.size ?? 0;
  const events = recentAdminEvents(50);
  return json({
    stats: {
      users,
      newUsers24h,
      jams,
      openJams,
      jamMsgs,
      dmMsgs,
      jamMsgs24h,
      dmMsgs24h,
      media,
      sessions,
      friends,
      pendingInvites,
      banned,
      online,
    },
    events,
  });
});