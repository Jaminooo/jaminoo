import { handle, json, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { parseUid } from '@/lib/constants';
import { pubUser } from '@/lib/users';

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
    select: {
      id: true,
      username: true,
      avatarId: true,
      bio: true,
      github: true,
      status: true,
      statusText: true,
      createdAt: true,
      profilePhotoId: true,
    },
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
    users: results.map((u) => ({ ...pubUser(u), friend: friendIds.has(u.id) })),
  });
});