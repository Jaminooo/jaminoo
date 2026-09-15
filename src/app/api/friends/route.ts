import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { uidDisplay, parseUid } from '@/lib/constants';

export const GET = handle(async () => {
  const me = await requireUser();
  const [incoming, outgoing, friends] = await Promise.all([
    prisma.friendRequest.findMany({
      where: { toId: me.id, status: 'PENDING' },
      include: { from: { select: { id: true, username: true, avatarId: true, bio: true, github: true, createdAt: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.friendRequest.findMany({
      where: { fromId: me.id, status: 'PENDING' },
      include: { to: { select: { id: true, username: true, avatarId: true, bio: true, github: true, createdAt: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.friendRequest.findMany({
      where: { status: 'FRIENDS', OR: [{ fromId: me.id }, { toId: me.id }] },
      include: {
        from: { select: { id: true, username: true, avatarId: true, bio: true, github: true, createdAt: true } },
        to: { select: { id: true, username: true, avatarId: true, bio: true, github: true, createdAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const friendUsers = friends.map((f) => (f.fromId === me.id ? f.to : f.from));

  const pub = (u: { id: number; username: string; avatarId: number; bio: string; github: boolean; createdAt: Date }) => ({
    id: u.id,
    username: u.username,
    uid: uidDisplay(u.id),
    avatarId: u.avatarId,
    bio: u.bio,
    github: u.github,
    createdAt: u.createdAt.toISOString(),
  });

  return json({
    friends: friendUsers.map(pub),
    incoming: incoming.map((r) => ({ id: r.id, user: pub(r.from) })),
    outgoing: outgoing.map((r) => ({ id: r.id, user: pub(r.to) })),
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
  return json({ ok: true, uid: uidDisplay(targetId) }, 201);
});