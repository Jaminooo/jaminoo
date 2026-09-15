import { handle, json, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';

// GET /api/jams/browse — public, open jams anyone can join
export const GET = handle(async () => {
  const me = await requireUser();
  const jams = await prisma.jam.findMany({
    where: { type: 'PUBLIC', closed: false },
    include: {
      owner: { select: { id: true, username: true, avatarId: true, profilePhotoId: true } },
      members: true,
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return json({
    jams: jams.map((j) => {
      const mine = j.ownerId === me.id;
      const inJam = mine || j.members.some((m) => m.userId === me.id);
      return {
        id: j.id,
        name: j.name,
        desc: j.desc,
        kind: j.kind,
        ownerId: j.ownerId,
        owner: { id: j.owner.id, username: j.owner.username, avatarId: j.owner.avatarId, profilePhotoId: j.owner.profilePhotoId },
        members: j.members.length,
        mine,
        inJam,
        lastActive: j.messages[0]?.createdAt.toISOString() ?? j.createdAt.toISOString(),
        createdAt: j.createdAt.toISOString(),
      };
    }),
  });
});