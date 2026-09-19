import { handle, json, err, requireAdmin } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { pushAdminEvent } from '@/lib/admin';
export const POST = handle(async (req: Request) => {
  const admin = await requireAdmin();
  const body = await req.json().catch(() => ({}));
  const title = String(body.title || '').trim().slice(0, 160);
  const message = String(body.message || '').trim().slice(0, 1000);
  const audience = String(body.audience || 'ALL').toUpperCase();
  const ids = Array.isArray(body.userIds) ? body.userIds.map(Number).filter((id: number) => Number.isInteger(id) && id > 0) : [];
  if (!title || !message) return err('Title and message are required');
  const where = audience === 'USERS' && ids.length ? { id: { in: ids } } : {};
  const users = await prisma.user.findMany({ where, select: { id: true } });
  await prisma.notification.createMany({ data: users.map((user) => ({ userId: user.id, kind: 'ADMIN_ANNOUNCEMENT', payload: JSON.stringify({ title, message, fromAdminId: admin.id, audience }) })) });
  pushAdminEvent('notification', `Sent announcement to ${users.length} users: ${title}`, { action: 'announcement', count: users.length });
  return json({ sent: users.length });
});
