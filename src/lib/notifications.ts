import { prisma } from '@/lib/prisma';
import { livePublish } from '@/lib/live-publish';

export const BROADCAST_KIND = 'ADMIN_BROADCAST';

export type NotifPayload = Record<string, unknown>;

export function safePayload(raw?: string | null): NotifPayload {
  try {
    const parsed = JSON.parse(raw || '{}');
    return (parsed && typeof parsed === 'object' ? parsed : {}) as NotifPayload;
  } catch {
    return {};
  }
}

export function notifActorId(payload: NotifPayload): number {
  const raw = payload.fromId ?? payload.userId ?? payload.followerId ?? 0;
  const n = Math.floor(Number(raw));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export async function pushNotification(userId: number, kind: string, payload: NotifPayload) {
  return pushNotifications([userId], kind, payload);
}

export async function pushNotifications(userIds: number[], kind: string, payload: NotifPayload) {
  const ids = Array.from(new Set((userIds ?? []).filter((id) => Number.isInteger(id) && id > 0)));
  if (ids.length === 0) return 0;
  const rows = ids.map((userId) => ({ userId, kind, payload: JSON.stringify(payload ?? {}) }));
  const CHUNK = 400;
  for (let i = 0; i < rows.length; i += CHUNK) {
    await prisma.notification.createMany({ data: rows.slice(i, i + CHUNK) });
  }
  livePublish(ids.map((id) => `user:${id}`), 'notif:new', { kind, at: Date.now() });
  return ids.length;
}

export interface NotificationRow {
  id: number;
  kind: string;
  payload: string;
  readAt: Date | null;
  createdAt: Date;
}

export interface NotifActor {
  id: number;
  username: string;
  name: string;
  avatarId: number;
  avatarPhoto: string | null;
}

export function serializeNotification(n: NotificationRow, actor?: NotifActor | null) {
  return {
    id: n.id,
    kind: n.kind,
    payload: safePayload(n.payload),
    createdAt: n.createdAt.toISOString(),
    readAt: n.readAt?.toISOString() ?? null,
    read: !!n.readAt,
    actor: actor ?? null,
  };
}