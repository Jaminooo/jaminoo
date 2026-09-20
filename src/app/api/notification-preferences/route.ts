import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { TWEET_NOTIF_KINDS } from '@/lib/notifications';

const PREF_KINDS = ['ALL', ...TWEET_NOTIF_KINDS] as const;
type PrefKind = (typeof PREF_KINDS)[number];

export const GET = handle(async () => {
  const me = await requireUser();
  const rows = await prisma.notificationPreference.findMany({
    where: { userId: me.id, kind: { in: [...PREF_KINDS] } },
    select: { kind: true, enabled: true },
  });
  const map = new Map(rows.map((r) => [r.kind, r.enabled]));
  return json({
    preferences: PREF_KINDS.map((kind) => ({ kind, enabled: map.get(kind) ?? true })),
  });
});

export const PUT = handle(async (req) => {
  const me = await requireUser();
  const body = await req.json().catch(() => ({}));
  const kind = body.kind as string;
  const enabled = body.enabled;
  if (!PREF_KINDS.includes(kind as PrefKind)) return err('Unknown preference', 400);
  if (typeof enabled !== 'boolean') return err('enabled must be a boolean', 400);

  await prisma.notificationPreference.upsert({
    where: { userId_kind: { userId: me.id, kind } },
    update: { enabled },
    create: { userId: me.id, kind, enabled },
  });
  return json({ ok: true });
});