import { handle, json, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { serializeTweetAuthor } from '@/lib/tweet';

// Follow requests directed at me that are waiting for a decision.
export const GET = handle(async (_req) => {
  const me = await requireUser();

  const sent = await prisma.tweetFollowRequest.findMany({
    where: { requesterId: me.id, status: 'PENDING' },
    select: { id: true, targetId: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const incoming = await prisma.tweetFollowRequest.findMany({
    where: { targetId: me.id, status: 'PENDING' },
    include: {
      requester: {
        select: {
          id: true,
          username: true,
          name: true,
          avatarId: true,
          profilePhotoId: true,
          bio: true,
          createdAt: true,
          _count: { select: { tweetFollowers: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return json({
    incoming: incoming.map((row) => ({
      id: row.id,
      createdAt: row.createdAt.toISOString(),
      requester: { ...serializeTweetAuthor({ ...row.requester, bio: row.requester.bio ?? '', website: '', location: '' }), joinedAt: row.requester.createdAt.toISOString(), followers: row.requester._count.tweetFollowers },
    })),
    sent: sent.map((row) => ({ id: row.id, targetId: row.targetId, createdAt: row.createdAt.toISOString() })),
  });
});