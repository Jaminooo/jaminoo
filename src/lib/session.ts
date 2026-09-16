import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';

export const SESSION_COOKIE = 'jam_session';
const SESSION_DAYS = 30;
const MAX_SESSIONS = 8;

export function parseUserAgent(ua: string | null | undefined): { name: string; device: string } {
  const s = ua || '';
  let browser = 'Browser';
  let device = 'Desktop';
  if (/android/i.test(s)) device = 'Android';
  else if (/iphone|ipad|ipod/i.test(s)) device = 'iOS';
  else if (/windows/i.test(s)) device = 'Windows';
  else if (/mac os/i.test(s)) device = 'macOS';
  else if (/linux/i.test(s)) device = 'Linux';
  if (/edg\//i.test(s)) browser = 'Edge';
  else if (/opr\//i.test(s)) browser = 'Opera';
  else if (/firefox/i.test(s)) browser = 'Firefox';
  else if (/chrome|crios/i.test(s)) browser = 'Chrome';
  else if (/safari/i.test(s)) browser = 'Safari';
  return { name: `${browser} · ${device}`, device };
}

export async function createSession(userId: number, meta?: { name?: string; device?: string; country?: string }) {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  const count = await prisma.session.count({ where: { userId } });
  if (count >= MAX_SESSIONS) {
    const oldest = await prisma.session.findFirst({ where: { userId }, orderBy: { createdAt: 'asc' } });
    if (oldest && oldest.token !== token) await prisma.session.delete({ where: { token: oldest.token } });
  }
  await prisma.session.create({ data: { token, userId, name: meta?.name ?? '', device: meta?.device ?? '', country: meta?.country ?? '', expiresAt } });
  const c = await cookies();
  c.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== '0',
    path: '/',
    expires: expiresAt,
  });
}

export async function destroySession() {
  const c = await cookies();
  const token = c.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { token } });
    c.delete(SESSION_COOKIE);
  } else {
    c.delete(SESSION_COOKIE);
  }
}

export async function getCurrentUser() {
  const c = await cookies();
  const token = c.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({ where: { token } });
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { token } });
    return null;
  }
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return null;
  if (user.bannedUntil && user.bannedUntil > new Date()) return null;
  return user;
}

export function isBanned(user: { bannedUntil: Date | null | undefined }): Date | false {
  if (user.bannedUntil && user.bannedUntil > new Date()) return user.bannedUntil;
  return false;
}

export async function getCurrentSessionToken() {
  const c = await cookies();
  return c.get(SESSION_COOKIE)?.value ?? null;
}