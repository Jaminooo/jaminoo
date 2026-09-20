import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { pushNotification } from '@/lib/notifications';

export const PATCH = handle(async (req, { params }: { params: { id: string } }) => {
  const me = await requireUser();
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return err('Invalid request', 400);

  const body = await req.json().catch(() => ({}));
  const accept = body.accept === true;

  const request = await prisma.tweetFollowRequest.findUnique({
    where: { id },
    select: { id: true, requesterId: true, targetId: true, status: true },
  });
  if (!request || request.targetId !== me.id) return err('Request not found', 404);
  if (request.status !== 'PENDING') return err('This request is already handled', 409);

  if (accept) {
    await prisma.tweetFollow.create({
      data: { followerId: request.requesterId, followingId: me.id },
    });
    await prisma.tweetFollowRequest.update({ where: { id }, data: { status: 'ACCEPTED' } });
    await pushNotification(request.requesterId, 'TWEET_FOLLOW', { fromId: me.id, username: me.username });
    return json({ ok: true, accepted: true });
  }

  await prisma.tweetFollowRequest.update({ where: { id }, data: { status: 'DECLINED' } });
  return json({ ok: true, accepted: false });
});