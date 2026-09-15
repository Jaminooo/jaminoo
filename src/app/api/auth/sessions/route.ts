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
        token: s.token,
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
    const current = await getCurrentSessionToken();

    if (!token) return err('Missing token');

    if (token === current) {
      await destroySession();
      return json({ ok: true, loggedOut: true });
    }

    const count = await prisma.session.count({ where: { userId: user.id } });
    if (count <= 1) return err('Cannot revoke');
    await prisma.session.delete({ where: { token } });
    return json({ ok: true });
  } catch (e: any) {
    if (e?.name === 'UnauthorizedError') return err('Not signed in', 401);
    console.error(e);
    return err('Something went wrong', 500);
  }
};