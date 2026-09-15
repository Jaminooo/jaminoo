import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { pubUser } from '@/lib/users';
import { getOrCreateConvo, areFriends } from '@/lib/dm';
import { msgPayload } from '@/lib/messages';
import { livePublish } from '@/lib/live-publish';

type Ctx = { params: { otherId: string } };

const USER_SELECT = {
  id: true,
  username: true,
  avatarId: true,
  bio: true,
  github: true,
  status: true,
  statusText: true,
  createdAt: true,
  profilePhotoId: true,
} as const;

// GET /api/dm/[otherId] — messages with a friend (1-on-1 private chat)
export const GET = handle(async (_req, { params }: Ctx) => {
  const me = await requireUser();
  const otherId = Number(params.otherId);
  if (!Number.isInteger(otherId) || otherId === me.id) return err('Invalid user');
  const other = await prisma.user.findUnique({
    where: { id: otherId },
    select: USER_SELECT,
  });
  if (!other) return err('No such user', 404);
  if (!(await areFriends(me.id, otherId))) return err('You can only chat with friends', 403);

  const conv = await getOrCreateConvo(me.id, otherId);
  const messages = await prisma.dmMessage.findMany({
    where: { convId: conv.id },
    include: {
      sender: { select: USER_SELECT },
      media: true,
      reactions: true,
    },
    orderBy: { id: 'asc' },
    take: 200,
  });

  // mark incoming as seen
  await prisma.dmMessage.updateMany({
    where: { convId: conv.id, senderId: otherId, seenAt: null },
    data: { seenAt: new Date() },
  });
  livePublish(`user:${otherId}`, 'dm:seen', { by: me.id, convId: conv.id });

  return json({
    convo: {
      id: conv.id,
      otherId,
      other: pubUser(other),
    },
    messages: messages.map((m) => {
      const justSeen = !m.seenAt && m.senderId === otherId ? new Date() : m.seenAt;
      const p = msgPayload({ ...m, userId: m.senderId, user: m.sender, seenAt: justSeen }, me.id);
      return { ...p, seenAt: justSeen?.toISOString() ?? null };
    }),
  });
});