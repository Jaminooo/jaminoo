import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { pubUser } from '@/lib/users';
import { getOrCreateConvo, areFriends } from '@/lib/dm';
import { msgPayload } from '@/lib/messages';

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
    },
    orderBy: { id: 'asc' },
    take: 200,
  });

  return json({
    convo: {
      id: conv.id,
      otherId,
      other: pubUser(other),
    },
    messages: messages.map((m) =>
      msgPayload({ ...m, userId: m.senderId, user: m.sender })
    ),
  });
});