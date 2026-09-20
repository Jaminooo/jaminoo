import { prisma } from '@/lib/prisma';
import { livePublish } from '@/lib/live-publish';

export const BROADCAST_KIND = 'ADMIN_BROADCAST';

// Map of notification kind -> Tweet Hub event type ("like", "retweet", ...).
export const TWEET_NOTIF_KINDS = ['TWEET_LIKE', 'TWEET_RETWEET', 'TWEET_REPLY', 'TWEET_FOLLOW', 'TWEET_QUOTE', 'TWEET_MENTION', 'TWEET_FOLLOW_REQUEST'] as const;

export const TWEET_TYPE_BY_KIND: Record<string, string> = {
  TWEET_LIKE: 'like',
  TWEET_RETWEET: 'retweet',
  TWEET_REPLY: 'reply',
  TWEET_FOLLOW: 'follow',
  TWEET_QUOTE: 'quote',
  TWEET_MENTION: 'mention',
  TWEET_FOLLOW_REQUEST: 'followRequest',
};

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
  let ids = Array.from(new Set((userIds ?? []).filter((id) => Number.isInteger(id) && id > 0)));
  if (ids.length === 0) return 0;

  // Respect per-kind opt-outs and the master switch ("ALL").
  const prefs = await prisma.notificationPreference.findMany({
    where: { userId: { in: ids }, enabled: false, OR: [{ kind: 'ALL' }, { kind }] },
    select: { userId: true },
  });
  const muted = new Set(prefs.map((p) => p.userId));
  ids = ids.filter((id) => !muted.has(id));
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
  const payload = safePayload(n.payload);
  return {
    id: n.id,
    kind: n.kind,
    payload,
    type: TWEET_TYPE_BY_KIND[n.kind] ?? null,
    tweetId: payload.tweetId ? Number(payload.tweetId) : null,
    tweetText: typeof payload.text === 'string' ? payload.text : '',
    createdAt: n.createdAt.toISOString(),
    readAt: n.readAt?.toISOString() ?? null,
    read: !!n.readAt,
    actor: actor ?? null,
  };
}