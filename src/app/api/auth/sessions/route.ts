import { prisma } from '@/lib/prisma';
import { requireUser, json, err } from '@/lib/api';
import { destroySession, getCurrentSessionToken } from '@/lib/session';

export const GET = async () => {
  try {
    const user = await requireUser();
    const current = await getCurrentSessionToken();
    const sessions = await prisma.session.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } });
    return json({
      sessions: sessions.map((s) => ({
        suffix: s.token.slice(-6),
        name: s.name,
        device: s.device,
        createdAt: s.createdAt.toISOString(),
        expiresAt: s.expiresAt.toISOString(),
        current: s.token === current,
      })),
    });
  } catch (e: any) {
    if (e?.name === 'UnauthorizedError') return err('Not signed in', 401);
    console.error(e);
    return err('Something went wrong', 500);
  }
};

export const DELETE = async (req: Request) => {
  try {
    const user = await requireUser();
    const body = await req.json();
    const token = body.token as string | undefined;
    let suffix: string | undefined;
    if (token) suffix = undefined;
    else {
      const s = body.suffix;
      if (typeof s !== 'string' || !s.length) return err('Missing token');
      suffix = s;
    }
    const current = await getCurrentSessionToken();

    if (token && token === current) {
      await destroySession();
      return json({ ok: true, loggedOut: true });
    }

    const total = await prisma.session.count({ where: { userId: user.id } });

    if (token) {
      const res = await prisma.session.deleteMany({ where: { token, userId: user.id } });
      if (res.count === 0) return err('Session not found', 404);
    } else {
      const suf = suffix!;
      const rows = await prisma.session.findMany({ where: { userId: user.id } });
      const targets = rows.filter((s) => s.token !== current && s.token.endsWith(suf));
      if (targets.length === 0) return err('Session not found', 404);
      if (total <= 1) return err('Cannot revoke');
      await prisma.session.deleteMany({
        where: { token: { in: targets.map((t) => t.token) }, userId: user.id },
      });
    }
    return json({ ok: true });
  } catch (e: any) {
    if (e?.name === 'UnauthorizedError') return err('Not signed in', 401);
    console.error(e);
    return err('Something went wrong', 500);
  }
};