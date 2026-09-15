import { handle, json, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { uidDisplay, parseUid } from '@/lib/constants';

// GET /api/users/search?q= — search by username or JM-ID
export const GET = handle(async (req) => {
  const me = await requireUser();
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') ?? '').trim().toLowerCase();
  if (q.length < 2) return json({ users: [] });

  const byUid = parseUid(q);
  const results = await prisma.user.findMany({
    where: {
      NOT: { id: me.id },
      OR: [
        { username: { contains: q } },
        ...(byUid ? [{ id: byUid }] : []),
      ],
    },
    select: { id: true, username: true, avatarId: true, bio: true, github: true, createdAt: true },
    take: 12,
  });

  const friendIds = new Set<number>();
  const friends = await prisma.friendRequest.findMany({
    where: { status: 'FRIENDS', OR: [{ fromId: me.id }, { toId: me.id }] },
    select: { fromId: true, toId: true },
  });
  for (const f of friends) {
    friendIds.add(f.fromId === me.id ? f.toId : f.fromId);
  }

  return json({
    users: results.map((u) => ({
      id: u.id,
      username: u.username,
      uid: uidDisplay(u.id),
      avatarId: u.avatarId,
      bio: u.bio,
      github: u.github,
      createdAt: u.createdAt.toISOString(),
      friend: friendIds.has(u.id),
    })),
  });
});