import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { livePublish } from '@/lib/live-publish';

type Ctx = { params: { id: string } };

// POST /api/jams/[id]/invite  { userId } — invite a friend into a private jam
export const POST = handle(async (req, { params }: Ctx) => {
  const me = await requireUser();
  const { userId } = (await req.json()) as { userId?: number };
  if (!userId) return err('Bad request');

  const jam = await prisma.jam.findUnique({
    where: { id: params.id },
    include: { members: true },
  });
  if (!jam) return err('Jam not found', 404);

  const isMember = jam.members.some((m) => m.userId === me.id);
  if (!isMember) return err('You are not in this jam', 403);

  // friendship required to invite
  const friends = await prisma.friendRequest.findFirst({
    where: { status: 'FRIENDS', OR: [{ fromId: me.id, toId: userId }, { fromId: userId, toId: me.id }] },
  });
  if (!friends) return err('You can only invite friends', 403);

  await prisma.jamMember.upsert({
    where: { jamId_userId: { jamId: jam.id, userId } },
    update: {},
    create: { jamId: jam.id, userId },
  });
  livePublish([`jam:${jam.id}`, `user:${userId}`, `user:${me.id}`], 'jam:update', jam.id);
  livePublish(`user:${userId}`, 'friends:update', { at: Date.now() });
  return json({ ok: true });
});