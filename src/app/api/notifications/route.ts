import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { serializeNotification, safePayload, notifActorId } from '@/lib/notifications';

export const GET = handle(async (req) => {
  const me = await requireUser();
  const params = new URL(req.url).searchParams;
  const cursor = Number(params.get('cursor') ?? 0);
  const take = Math.min(60, Math.max(1, Number(params.get('take') ?? 40)));
  const filter = params.get('filter');

  const where: any = { userId: me.id };
  if (filter === 'unread') where.readAt = null;
  if (Number.isInteger(cursor) && cursor > 0) where.id = { lt: cursor };

  const [rows, unread] = await Promise.all([
    prisma.notification.findMany({ where, orderBy: { id: 'desc' }, take: take + 1 }),
    prisma.notification.count({ where: { userId: me.id, readAt: null } }),
  ]);
  const hasMore = rows.length > take;
  const page = hasMore ? rows.slice(0, take) : rows;

  const actorIds = Array.from(new Set(page.map((n) => notifActorId(safePayload(n.payload))).filter((id) => id > 0)));
  const actors = actorIds.length > 0
    ? await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, username: true, name: true, avatarId: true, profilePhotoId: true } })
    : [];
  const actorMap = new Map(actors.map((u) => [u.id, u]));

  return json({
    notifications: page.map((n) => {
      const payload = safePayload(n.payload);
      const actor = actorMap.get(notifActorId(payload));
      return serializeNotification(n, actor
        ? {
            id: actor.id,
            username: actor.username,
            name: actor.name ?? '',
            avatarId: actor.avatarId,
            avatarPhoto: actor.profilePhotoId ? `/api/media/${actor.profilePhotoId}` : null,
          }
        : null);
    }),
    nextCursor: hasMore ? String(page[page.length - 1].id) : null,
    hasMore,
    unread,
  });
});

export const PATCH = handle(async (req) => {
  const me = await requireUser();
  const body = await req.json().catch(() => ({}));
  const id = Number(body?.id ?? 0);
  if (Number.isInteger(id) && id > 0) {
    await prisma.notification.updateMany({ where: { id, userId: me.id }, data: { readAt: new Date() } });
  } else {
    await prisma.notification.updateMany({ where: { userId: me.id, readAt: null }, data: { readAt: new Date() } });
  }
  return json({ read: true });
});

export const DELETE = handle(async (req) => {
  const me = await requireUser();
  const id = Number(new URL(req.url).searchParams.get('id') ?? 0);
  if (!Number.isInteger(id) || id <= 0) return err('Invalid ID', 400);
  await prisma.notification.deleteMany({ where: { id, userId: me.id } });
  return json({ deleted: true });
});