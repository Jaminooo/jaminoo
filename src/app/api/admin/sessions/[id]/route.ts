import { handle, json, err, requireAdmin } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { pushAdminEvent } from '@/lib/admin';

type Ctx = { params: { id: string } };

export const DELETE = handle(async (_req, { params }: Ctx) => {
  await requireAdmin();
  const token = params.id;
  const session = await prisma.session.findUnique({
    where: { token },
    select: { token: true, userId: true, user: { select: { username: true } } },
  });
  if (!session) return err('Not found', 404);
  await prisma.session.delete({ where: { token } });
  try {
    (globalThis as any).__jaminoLive?.io?.to(`user:${session.userId}`).emit('session:revoked', { token });
  } catch {}
  pushAdminEvent('warn', `Session of @${session.user.username} revoked`, {
    action: 'session-kick',
    userId: session.userId,
    token,
  });
  return json({ ok: true });
});