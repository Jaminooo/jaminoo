import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { pushNotification } from '@/lib/notifications';

type Ctx = { params: { id: string } };

export const POST = handle(async (_req, { params }: Ctx) => {
  const me = await requireUser();
  const targetId = Number(params.id);
  if (!Number.isInteger(targetId) || targetId <= 0) return err('Invalid user', 400);
  if (targetId === me.id) return err('You cannot follow yourself');
  const target = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true, username: true } });
  if (!target) return err('User not found', 404);

  const existing = await prisma.tweetFollow.findUnique({
    where: { followerId_followingId: { followerId: me.id, followingId: targetId } },
  });
  if (existing) {
    await prisma.tweetFollow.delete({ where: { id: existing.id } });
  } else {
    await prisma.tweetFollow.create({ data: { followerId: me.id, followingId: targetId } });
    await pushNotification(targetId, 'TWEET_FOLLOW', { fromId: me.id });
  }
  return json({ following: !existing });
});