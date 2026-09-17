import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { livePublish } from '@/lib/live-publish';

type Ctx = { params: { id: string } };

async function getMember(jamId: string, userId: number) {
  const jam = await prisma.jam.findUnique({ where: { id: jamId }, select: { id: true, kind: true, members: { select: { userId: true } } } });
  if (!jam || jam.kind !== 'MUSIC') return null;
  return jam.members.some((member) => member.userId === userId) ? jam : null;
}

export const POST = handle(async (req, { params }) => {
  const me = await requireUser();
  const jam = await getMember(params.id, me.id);
  if (!jam) return err('You are not in this music jam', 403);
  const body = await req.json().catch(() => ({}));
  const queueItemId = Number(body.queueItemId);
  if (!Number.isInteger(queueItemId) || queueItemId <= 0) return err('Invalid queue item');
  const item = await prisma.jamQueueItem.findFirst({ where: { id: queueItemId, jamId: params.id }, select: { id: true } });
  if (!item) return err('Queue item not found', 404);
  await prisma.jamQueueVote.upsert({
    where: { queueItemId_userId: { queueItemId, userId: me.id } },
    create: { jamId: params.id, queueItemId, userId: me.id },
    update: {},
  });
  const count = await prisma.jamQueueVote.count({ where: { queueItemId } });
  livePublish(`jam:${params.id}`, 'music:vote', { jamId: params.id, queueItemId, votes: count });
  return json({ voted: true, votes: count });
});

export const DELETE = handle(async (req, { params }) => {
  const me = await requireUser();
  const jam = await getMember(params.id, me.id);
  if (!jam) return err('You are not in this music jam', 403);
  const body = await req.json().catch(() => ({}));
  const queueItemId = Number(body.queueItemId);
  if (!Number.isInteger(queueItemId) || queueItemId <= 0) return err('Invalid queue item');
  await prisma.jamQueueVote.deleteMany({ where: { queueItemId, userId: me.id, jamId: params.id } });
  const count = await prisma.jamQueueVote.count({ where: { queueItemId } });
  livePublish(`jam:${params.id}`, 'music:vote', { jamId: params.id, queueItemId, votes: count });
  return json({ voted: false, votes: count });
});
