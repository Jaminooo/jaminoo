import { handle, json, err, requireAdmin } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { pushAdminEvent } from '@/lib/admin';

type Ctx = { params: { id: string } };

async function kickUser(userId: number, reason: string) {
  try {
    (globalThis as any).__jaminoLive?.io?.to(`user:${userId}`).emit('you:banned', { reason });
  } catch {}
}

export const GET = handle(async (_req, { params }: Ctx) => {
  const me = await requireAdmin();
  const id = Number(params.id);
  if (!Number.isInteger(id)) return err('Bad request', 400);
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      username: true,
      email: true,
      github: true,
      githubLogin: true,
      avatarId: true,
      profilePhotoId: true,
      bio: true,
      status: true,
      statusText: true,
      isAdmin: true,
      bannedUntil: true,
      bannedReason: true,
      createdAt: true,
      _count: {
        select: {
          sessions: true,
          jams: true,
          messages: true,
          dmMessages: true,
          media: true,
          reactions: true,
          friendRequestsA: true,
          friendRequestsB: true,
          jamInvitesSent: true,
          jamInvitesReceived: true,
        },
      },
    },
  });
  if (!user) return err('Not found', 404);
  const [sessions, recentMessages] = await Promise.all([
    prisma.session.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { token: true, name: true, device: true, createdAt: true, expiresAt: true },
    }),
    prisma.jamMessage.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, kind: true, text: true, createdAt: true, jam: { select: { id: true, name: true } } },
    }),
  ]);
  return json({ user, sessions, recentMessages, self: me.id === id });
});

export const PATCH = handle(async (req, { params }: Ctx) => {
  const me = await requireAdmin();
  const id = Number(params.id);
  if (!Number.isInteger(id)) return err('Bad request', 400);
  if (id === me.id) return err('You cannot change your own admin state', 400);
  const body = (await req.json()) as { action?: string; days?: number; reason?: string };
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return err('Not found', 404);

  if (body.action === 'promote') {
    await prisma.user.update({ where: { id }, data: { isAdmin: true } });
    pushAdminEvent('admin', `Admin promoted @${target.username} to admin`, { action: 'promote', uid: id });
    return json({ ok: true });
  }

  if (body.action === 'demote') {
    await prisma.user.update({ where: { id }, data: { isAdmin: false } });
    pushAdminEvent('warn', `Admin removed @${target.username} from admins`, { action: 'demote', uid: id });
    return json({ ok: true });
  }

  if (body.action === 'ban') {
    const days = Math.max(1, Math.min(36500, Number(body.days) || 7));
    const reason = (body.reason ?? '').trim();
    const bannedUntil = new Date(Date.now() + days * 86400000);
    await prisma.user.update({ where: { id }, data: { isAdmin: false, bannedUntil, bannedReason: reason } });
    await prisma.session.deleteMany({ where: { userId: id } });
    await kickUser(id, reason);
    pushAdminEvent('error', `@${target.username} banned for ${days}d`, {
      action: 'ban',
      uid: id,
      days,
      reason,
    });
    return json({ ok: true });
  }

  if (body.action === 'unban') {
    await prisma.user.update({ where: { id }, data: { bannedUntil: null, bannedReason: '' } });
    pushAdminEvent('ok', `@${target.username} unbanned`, { action: 'unban', uid: id });
    return json({ ok: true });
  }

  return err('Unknown action', 400);
});