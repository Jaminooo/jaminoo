import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { pushNotification } from '@/lib/notifications';
import { rateLimit } from '@/lib/rate-limit';

type Ctx = { params: { id: string } };

export const POST = handle(async (_req, { params }: Ctx) => {
  const me = await requireUser();
  rateLimit(`tweets:follow:${me.id}`, 60, 60 * 60 * 1000);
  const targetId = Number(params.id);
  if (!Number.isInteger(targetId) || targetId <= 0) return err('Invalid user', 400);
  if (targetId === me.id) return err('You cannot follow yourself');
  const target = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true, username: true, isPrivate: true } });
  if (!target) return err('User not found', 404);

  const existing = await prisma.tweetFollow.findUnique({
    where: { followerId_followingId: { followerId: me.id, followingId: targetId } },
  });
  if (existing) {
    await prisma.tweetFollow.delete({ where: { id: existing.id } });
    // Cancel any outstanding request too, so a re-follow makes a fresh request.
    await prisma.tweetFollowRequest.deleteMany({ where: { requesterId: me.id, targetId } });
    return json({ following: false, requested: false });
  }

  if (target.isPrivate) {
    const request = await prisma.tweetFollowRequest.findUnique({
      where: { requesterId_targetId: { requesterId: me.id, targetId } },
    });
    if (request && request.status === 'PENDING') {
      await prisma.tweetFollowRequest.delete({ where: { id: request.id } });
      return json({ following: false, requested: false });
    }
    if (request && request.status === 'ACCEPTED') {
      await prisma.tweetFollow.create({ data: { followerId: me.id, followingId: targetId } });
      return json({ following: true, requested: false });
    }
    await prisma.tweetFollowRequest.create({ data: { requesterId: me.id, targetId, status: 'PENDING' } });
    await pushNotification(targetId, 'TWEET_FOLLOW_REQUEST', { fromId: me.id, username: me.username });
    return json({ following: false, requested: true });
  }

  await prisma.tweetFollow.create({ data: { followerId: me.id, followingId: targetId } });
  await pushNotification(targetId, 'TWEET_FOLLOW', { fromId: me.id });
  return json({ following: true, requested: false });
});