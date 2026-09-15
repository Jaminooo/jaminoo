import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { pubUser } from '@/lib/users';

type Ctx = { params: { id: string } };

export const GET = handle(async (_req, { params }: Ctx) => {
  const me = await requireUser();
  const jam = await prisma.jam.findUnique({
    where: { id: params.id },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatarId: true,
              bio: true,
              github: true,
              createdAt: true,
              profilePhotoId: true,
            },
          },
        },
      },
      messages: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatarId: true,
              bio: true,
              github: true,
              createdAt: true,
              profilePhotoId: true,
            },
          },
        },
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
      members: jam.members.map((m) => pubUser(m.user)),
      messages: jam.messages.map((m) => ({
        id: m.id,
        userId: m.userId,
        text: m.text,
        createdAt: m.createdAt.toISOString(),
        user: pubUser(m.user),
      })),
    },
  });
});