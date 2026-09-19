import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { uidDisplay, parseUid } from '@/lib/constants';
import { pubUser } from '@/lib/users';
import { livePublish, liveRefreshPresence, invalidateFriendCache } from '@/lib/live-publish';
import { pushNotification } from '@/lib/notifications';

export const GET = handle(async () => {
  const me = await requireUser();
  const [incoming, outgoing, friends] = await Promise.all([
    prisma.friendRequest.findMany({
      where: { toId: me.id, status: 'PENDING' },
      include: {
        from: {
          select: {
            id: true,
            username: true,
            avatarId: true,
            bio: true,
            github: true,
            status: true,
            statusText: true,
            createdAt: true,
            profilePhotoId: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.friendRequest.findMany({
      where: { fromId: me.id, status: 'PENDING' },
      include: {
        to: {
          select: {
            id: true,
            username: true,
            avatarId: true,
            bio: true,
            github: true,
            status: true,
            statusText: true,
            createdAt: true,
            profilePhotoId: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.friendRequest.findMany({
      where: { status: 'FRIENDS', OR: [{ fromId: me.id }, { toId: me.id }] },
      include: {
        from: {
          select: {
            id: true,
            username: true,
            avatarId: true,
            bio: true,
            github: true,
            status: true,
            statusText: true,
            createdAt: true,
            profilePhotoId: true,
          },
        },
        to: {
          select: {
            id: true,
            username: true,
            avatarId: true,
            bio: true,
            github: true,
            status: true,
            statusText: true,
            createdAt: true,
            profilePhotoId: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const friendUsers = friends.map((f) => (f.fromId === me.id ? f.to : f.from));

  return json({
    friends: friendUsers.map(pubUser),
    incoming: incoming.map((r) => ({ id: r.id, user: pubUser(r.from) })),
    outgoing: outgoing.map((r) => ({ id: r.id, user: pubUser(r.to) })),
  });
});

export const POST = handle(async (req) => {
  const me = await requireUser();
  const { target } = (await req.json()) as { target?: string };
  const targetId = target ? parseUid(target) : null;
  if (!targetId) return err('Invalid ID');
  if (targetId === me.id) return err('Cannot add yourself');

  const targetUser = await prisma.user.findUnique({ where: { id: targetId } });
  if (!targetUser) return err('No user with that ID', 404);

  const existing = await prisma.friendRequest.findFirst({
    where: { OR: [{ fromId: me.id, toId: targetId }, { fromId: targetId, toId: me.id }] },
  });
  if (existing) return err('Request already exists', 409);

  await prisma.friendRequest.create({ data: { fromId: me.id, toId: targetId, status: 'PENDING' } });
  await pushNotification(targetId, 'FRIEND_REQUEST', { fromId: me.id, username: me.username });
  livePublish([`user:${me.id}`, `user:${targetId}`], 'friends:update', { at: Date.now() });
  return json({ ok: true, uid: uidDisplay(targetId) }, 201);
});

// DELETE { target } — remove a friend / cancel my outgoing request
export const DELETE = handle(async (req) => {
  const me = await requireUser();
  const { target } = (await req.json()) as { target?: string };
  const targetId = target ? parseUid(target) : null;
  if (!targetId || targetId === me.id) return err('Invalid ID');

  await prisma.friendRequest.deleteMany({
    where: {
      OR: [
        { fromId: me.id, toId: targetId },
        { fromId: targetId, toId: me.id },
      ],
    },
  });
  livePublish([`user:${me.id}`, `user:${targetId}`], 'friends:update', { at: Date.now() });
  invalidateFriendCache(me.id, targetId);
  liveRefreshPresence();
  return json({ ok: true });
});
