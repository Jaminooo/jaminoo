import { handle, json, err, requireAdmin } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { pushAdminEvent } from '@/lib/admin';
import { pushNotifications, BROADCAST_KIND, safePayload } from '@/lib/notifications';

type AudienceFilter = { online?: boolean; admins?: boolean; banned?: boolean; country?: string };
type AudienceSpec = { all?: boolean; userIds?: number[]; filter?: AudienceFilter };

async function resolveAudience(spec: AudienceSpec | null | undefined): Promise<number[]> {
  const { all = false, userIds = [], filter = {} } = spec ?? {};
  const hasFilter = !!(filter && (filter.online || filter.admins || filter.banned || filter.country));
  let ids: number[] = [];

  if (all || hasFilter) {
    const where: any = {};
    const conds: Record<string, unknown>[] = [];
    if (filter?.online) {
      const onlineIds = [...((globalThis as any).__jaminoLive?.online?.keys?.() ?? [])];
      if (onlineIds.length === 0) return [];
      conds.push({ id: { in: onlineIds } });
    }
    if (filter?.admins) conds.push({ isAdmin: true });
    if (filter?.banned) conds.push({ bannedUntil: { gt: new Date() } });
    else conds.push({ bannedUntil: null });
    if (filter?.country) {
      conds.push({ sessions: { some: { country: { equals: String(filter.country).toUpperCase(), mode: 'insensitive' } } } });
    }
    if (conds.length) where.AND = conds;
    const rows = await prisma.user.findMany({ where, select: { id: true } });
    ids = rows.map((r) => r.id);
  } else {
    ids = (userIds ?? []).filter((id) => Number.isInteger(id) && id > 0);
  }

  return Array.from(new Set(ids));
}

function audienceLabel(spec: AudienceSpec | null | undefined): string {
  if (spec?.all) return 'ALL';
  if (spec?.filter) {
    const parts = Object.entries(spec.filter)
      .filter(([, v]) => Boolean(v))
      .map(([k, v]) => `${k}:${String(v).toLowerCase()}`)
      .join(',');
    return parts ? `FILTER:${parts}` : 'NONE';
  }
  const n = (spec?.userIds ?? []).length;
  return n > 0 ? `USERS:${n}` : 'NONE';
}

export const GET = handle(async (req: Request) => {
  const admin = await requireAdmin();
  const params = new URL(req.url).searchParams;

  if (params.get('audience') === '1') {
    const spec: AudienceSpec = {
      all: params.get('all') === '1',
      userIds: params.get('ids')
        ? params
            .get('ids')!
            .split(',')
            .map((s) => Number(s.trim()))
            .filter((n) => Number.isInteger(n) && n > 0)
        : [],
      filter: {
        online: params.get('online') === '1',
        admins: params.get('admins') === '1',
        banned: params.get('banned') === '1',
        country: params.get('country') || undefined,
      },
    };
    const ids = await resolveAudience(spec);
    return json({ count: ids.length, onlineCount: (globalThis as any).__jaminoLive?.online?.size ?? 0 });
  }

  const [labels, sentGroups, readGroups] = await Promise.all([
    prisma.notification.findMany({
      where: { kind: BROADCAST_KIND },
      orderBy: { id: 'desc' },
      take: 300,
      select: { id: true, payload: true, createdAt: true },
    }),
    prisma.notification.groupBy({ by: ['payload'], where: { kind: BROADCAST_KIND }, _count: { _all: true } }),
    prisma.notification.groupBy({ by: ['payload'], where: { kind: BROADCAST_KIND, readAt: { not: null } }, _count: { _all: true } }),
  ]);
  const sentMap = new Map(sentGroups.map((g) => [g.payload, Number(g._count._all)]));
  const readMap = new Map(readGroups.map((g) => [g.payload, Number(g._count._all)]));

  const seen = new Set<string>();
  const broadcasts: {
    batchId: string;
    createdAt: string;
    title: unknown;
    message: unknown;
    audience: unknown;
    author: unknown;
    sent: number;
    read: number;
    createdBy: string;
  }[] = [];
  for (const row of labels) {
    if (seen.has(row.payload)) continue;
    seen.add(row.payload);
    const payload = safePayload(row.payload);
    broadcasts.push({
      batchId: String(payload.batchId ?? `n:${row.id}`),
      createdAt: row.createdAt.toISOString(),
      title: payload.title ?? null,
      message: payload.message ?? null,
      audience: payload.audience ?? null,
      author: payload.author ?? null,
      sent: sentMap.get(row.payload) ?? 1,
      read: readMap.get(row.payload) ?? 0,
      createdBy: admin.username,
    });
  }

  return json({ broadcasts });
});

export const POST = handle(async (req: Request) => {
  const admin = await requireAdmin();
  const body = await req.json().catch(() => ({}));
  const title = typeof body.title === 'string' ? body.title.trim().slice(0, 120) : '';
  const msgFa = typeof body.message?.fa === 'string' ? body.message.fa.trim().slice(0, 1000) : '';
  const msgEn = typeof body.message?.en === 'string' ? body.message.en.trim().slice(0, 1000) : '';
  if (!msgFa && !msgEn) return err('Write a message in at least one language');

  const spec: AudienceSpec = body.audience ?? { all: true };
  const ids = await resolveAudience(spec);
  if (ids.length === 0) return err('No recipients match this audience');

  const batchId = `ADM-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const payload = {
    batchId,
    author: admin.username,
    title: title || undefined,
    message: { fa: msgFa, en: msgEn },
    audience: audienceLabel(spec),
  };
  await pushNotifications(ids, BROADCAST_KIND, payload);
  pushAdminEvent('admin', `Broadcast "ADM-${batchId}" sent to ${ids.length} users`, { action: 'notify-broadcast', batchId, count: ids.length });
  return json({ ok: true, count: ids.length, batchId }, 201);
});

export const DELETE = handle(async (req: Request) => {
  await requireAdmin();
  const batch = (new URL(req.url).searchParams.get('batch') ?? '').trim();
  if (!batch.startsWith('ADM-')) return err('Invalid batch', 400);
  const result = await prisma.notification.deleteMany({
    where: { kind: BROADCAST_KIND, payload: { contains: `"batchId":"${batch}"` } },
  });
  pushAdminEvent('admin', `Broadcast "${batch}" removed (${result.count} rows)`, { action: 'notify-broadcast-delete', batchId: batch, count: result.count });
  return json({ deleted: result.count });
});
