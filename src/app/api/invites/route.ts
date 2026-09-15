import { handle, json, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { pubUser } from '@/lib/users';

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

// GET /api/invites — pending jam invitations for me
export const GET = handle(async () => {
  const me = await requireUser();
  const invites = await prisma.jamInvite.findMany({
    where: { toId: me.id, status: 'PENDING' },
    include: {
      jam: { include: { members: true } },
      from: { select: USER_SELECT },
    },
    orderBy: { createdAt: 'desc' },
  });
  return json({
    invites: invites.map((i) => ({
      id: i.id,
      jamId: i.jamId,
      jamName: i.jam.name,
      members: i.jam.members.length,
      createdAt: i.createdAt.toISOString(),
      from: pubUser(i.from),
    })),
  });
});