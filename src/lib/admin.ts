import { prisma } from '@/lib/prisma';

export async function ensureAdmins() {
  const list = (process.env.ADMIN_USERNAMES ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (list.length === 0) return;
  const rows = await prisma.user.findMany({
    where: { username: { in: list } },
    select: { id: true, username: true, isAdmin: true },
  });
  for (const r of rows) {
    if (!r.isAdmin) await prisma.user.update({ where: { id: r.id }, data: { isAdmin: true } });
  }
}

export interface AdminEvent {
  at: number;
  type: string;
  text: string;
  meta?: Record<string, unknown>;
}

const recentEvents: AdminEvent[] = [];
const MAX_EVENTS = 200;

export function pushAdminEvent(type: string, text: string, meta?: Record<string, unknown>) {
  const ev: AdminEvent = { at: Date.now(), type, text, meta };
  recentEvents.unshift(ev);
  if (recentEvents.length > MAX_EVENTS) recentEvents.length = MAX_EVENTS;
  try {
    const g = globalThis as any;
    g.__jaminoLive?.io?.to('admin').emit('admin:event', ev);
  } catch {}
  return ev;
}

export function recentAdminEvents(limit = 50) {
  return recentEvents.slice(0, limit);
}