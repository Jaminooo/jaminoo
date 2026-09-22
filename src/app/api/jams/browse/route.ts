import { handle, json, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { jamCardPayload } from '@/lib/jam-card';

// GET /api/jams/browse — public, open DJ sets anyone can join
export const GET = handle(async () => {
  const me = await requireUser();
  const jams = await prisma.jam.findMany({
    where: { type: 'PUBLIC', closed: false, kind: 'MUSIC' },
    include: {
      owner: { select: { id: true, username: true, avatarId: true, profilePhotoId: true } },
      members: true,
      currentSong: { include: { artist: { select: { id: true, name: true } }, album: { select: { id: true, title: true, coverFile: true } } } },
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return json({
    jams: jams.map((j) => ({
      ...jamCardPayload(j, me.id),
      lastActive: j.messages[0]?.createdAt.toISOString() ?? j.createdAt.toISOString(),
      createdAt: j.createdAt.toISOString(),
    })),
  });
});