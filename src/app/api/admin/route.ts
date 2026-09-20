import { handle, json, err } from '@/lib/api';
import { requireAnyAdmin } from '@/lib/roles';
import { prisma } from '@/lib/prisma';
import { recentAdminEvents } from '@/lib/admin';

export const GET = handle(async () => {
  await requireAnyAdmin();
  const dayAgo = new Date(Date.now() - 86400000);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
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

  const countryRows = await prisma.session.groupBy({
    by: ['country'],
    _count: true,
    where: { createdAt: { gte: thirtyDaysAgo }, country: { not: '' } },
    orderBy: { _count: { country: 'desc' } },
    take: 20,
  });
  const countryStats = countryRows.map((r) => ({ country: r.country, count: r._count }));

  const signupRows: { day: string; count: bigint }[] = await prisma.$queryRaw`
    SELECT TO_CHAR(DATE("createdAt"), 'YYYY-MM-DD') AS day, COUNT(*) AS count
    FROM "User"
    WHERE "createdAt" >= ${sevenDaysAgo}
    GROUP BY DATE("createdAt")
    ORDER BY DATE("createdAt") ASC
  `;
  const signupTrend = signupRows.map((r) => ({ date: r.day, count: Number(r.count) }));

  const online = (globalThis as any).__jaminoLive?.online?.size ?? 0;
  const events = recentAdminEvents(50);
  const ctx = await requireAnyAdmin();
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
      countryStats,
      signupTrend,
    },
    events,
    admin: {
      username: ctx.user.username,
      scope: ctx.scope,
      isSuper: ctx.isSuper,
      hubScopes: ctx.role && !ctx.isSuper ? [ctx.role.scope] : [],
    },
  });
});
