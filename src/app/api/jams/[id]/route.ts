import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { uidDisplay } from '@/lib/constants';

type Ctx = { params: { id: string } };

export const GET = handle(async (_req, { params }: Ctx) => {
  const me = await requireUser();
  const jam = await prisma.jam.findUnique({
    where: { id: params.id },
    include: {
      members: { include: { user: { select: { id: true, username: true, avatarId: true, github: true } } } },
      messages: {
        include: { user: { select: { id: true, username: true, avatarId: true, github: true } } },
        orderBy: { createdAt: 'asc' },
        take: 100,
      },
    },
  });
  if (!jam) return err('Jam not found', 404);
  const isMember = jam.members.some((m) => m.userId === me.id);
  if (!isMember) return err('You are not in this jam', 403);

  return json({
    jam: {
      id: jam.id,
      name: jam.name,
      desc: jam.desc,
      type: jam.type,
      ownerId: jam.ownerId,
      createdAt: jam.createdAt.toISOString(),
      members: jam.members.map((m) => ({
        id: m.user.id,
        username: m.user.username,
        uid: uidDisplay(m.user.id),
        avatarId: m.user.avatarId,
        github: m.user.github,
      })),
      messages: jam.messages.map((m) => ({
        id: m.id,
        userId: m.userId,
        text: m.text,
        createdAt: m.createdAt.toISOString(),
        user: {
          id: m.user.id,
          username: m.user.username,
          avatarId: m.user.avatarId,
          github: m.user.github,
        },
      })),
    },
  });
});