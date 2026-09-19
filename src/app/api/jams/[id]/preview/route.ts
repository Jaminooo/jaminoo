import { handle, err, json } from '@/lib/api';
import { prisma } from '@/lib/prisma';

type Ctx = { params: { id: string } };

export const GET = handle(async (_req, { params }: Ctx) => {
  const jam = await prisma.jam.findUnique({
    where: { id: params.id },
    include: {
      owner: { select: { username: true, avatarId: true, profilePhotoId: true } },
      _count: { select: { members: true } },
    },
  });
  if (!jam) return err('Jam not found', 404);
  return json({
    jam: {
      id: jam.id,
      name: jam.name,
      desc: jam.desc,
      type: jam.type,
      kind: jam.kind,
      closed: jam.closed,
      members: jam._count.members,
      owner: jam.owner,
    },
  });
});
