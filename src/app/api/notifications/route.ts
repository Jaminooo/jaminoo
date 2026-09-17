import { handle, json, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';

export const GET = handle(async () => {
  const me = await requireUser();
  const notifications = await prisma.notification.findMany({ where: { userId: me.id }, orderBy: { createdAt: 'desc' }, take: 80 });
  return json({ notifications: notifications.map((n) => ({ ...n, payload: JSON.parse(n.payload || '{}'), createdAt: n.createdAt.toISOString(), readAt: n.readAt?.toISOString() ?? null })) });
});

export const PATCH = handle(async () => {
  const me = await requireUser();
  await prisma.notification.updateMany({ where: { userId: me.id, readAt: null }, data: { readAt: new Date() } });
  return json({ read: true });
});
