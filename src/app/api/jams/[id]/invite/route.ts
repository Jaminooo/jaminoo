import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { livePublish } from '@/lib/live-publish';
import { pushNotification } from '@/lib/notifications';

type Ctx = { params: { id: string } };

// POST /api/jams/[id]/invite  { userId } — send a join request to a friend (they must accept)
export const POST = handle(async (req, { params }: Ctx) => {
  const me = await requireUser();
  const { userId } = (await req.json()) as { userId?: number };
  if (!userId) return err('Bad request');

  const jam = await prisma.jam.findUnique({
    where: { id: params.id },
    include: { members: true },
  });
  if (!jam) return err('Jam not found', 404);
  if (!jam.members.some((m) => m.userId === me.id)) return err('You are not in this jam', 403);
  if (jam.closed) return err('This jam is closed', 403);
  if (jam.members.some((m) => m.userId === userId)) return err('Already a member');

  // friendship required to invite
  const friends = await prisma.friendRequest.findFirst({
    where: { status: 'FRIENDS', OR: [{ fromId: me.id, toId: userId }, { fromId: userId, toId: me.id }] },
  });
  if (!friends) return err('You can only invite friends', 403);

  const existing = await prisma.jamInvite.findFirst({
    where: { jamId: jam.id, toId: userId, status: 'PENDING' },
  });
  if (existing) return err('Invite already pending', 409);

  await prisma.jamInvite.create({ data: { jamId: jam.id, fromId: me.id, toId: userId } });
  await pushNotification(userId, 'JAM_INVITE', { fromId: me.id, username: me.username, jamId: jam.id, jamName: jam.name });
  livePublish([`user:${userId}`, `user:${me.id}`], 'jam-invite', { at: Date.now() });
  return json({ ok: true });
});
