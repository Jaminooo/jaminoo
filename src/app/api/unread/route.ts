import { handle, json, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { livePublish } from '@/lib/live-publish';
import { liveBroadcast } from '@/lib/live-publish';

// GET /api/unread — counts for badges
export const GET = handle(async () => {
  const me = await requireUser();

  const incomingFriends = prisma.friendRequest.count({
    where: { toId: me.id, status: 'PENDING' },
  });

  const pendingInvites = prisma.jamInvite.count({
    where: { toId: me.id, status: 'PENDING' },
  });

  const convs = await prisma.conversation.findMany({
    where: { OR: [{ userA: me.id }, { userB: me.id }] },
  });

  let unreadDms = 0;
  for (const c of convs) {
    const otherId = c.userA === me.id ? c.userB : c.userA;
    const count = await prisma.dmMessage.count({
      where: { convId: c.id, senderId: otherId, seenAt: null },
    });
    unreadDms += count;
  }

  return json({
    friends: await incomingFriends,
    invites: await pendingInvites,
    dms: unreadDms,
  });
});
