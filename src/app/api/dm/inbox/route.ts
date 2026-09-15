import { handle, json, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { pubUser } from '@/lib/users';

export const GET = handle(async () => {
  const me = await requireUser();
  const convs = await prisma.conversation.findMany({
    where: { OR: [{ userA: me.id }, { userB: me.id }] },
    include: {
      userA_ref: {
        select: { id: true, username: true, avatarId: true, profilePhotoId: true, status: true, statusText: true },
      },
      userB_ref: {
        select: { id: true, username: true, avatarId: true, profilePhotoId: true, status: true, statusText: true },
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: { sender: { select: { id: true, username: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const results = await Promise.all(
    convs.map(async (c) => {
      const other = c.userA === me.id ? c.userB_ref : c.userA_ref;
      const lastMsg = c.messages[0] ?? null;
      const unreadCount = await prisma.dmMessage.count({
        where: { convId: c.id, senderId: other.id, seenAt: null },
      });
      return {
        id: c.id,
        other: pubUser({
          id: other.id,
          username: other.username,
          avatarId: other.avatarId,
          profilePhotoId: other.profilePhotoId,
          status: other.status,
          statusText: other.statusText,
          github: false,
        }),
        lastMessage: lastMsg
          ? { text: lastMsg.text, kind: lastMsg.kind, senderId: lastMsg.senderId, createdAt: lastMsg.createdAt.toISOString() }
          : null,
        unreadCount,
      };
    })
  );

  return json({ conversations: results });
});