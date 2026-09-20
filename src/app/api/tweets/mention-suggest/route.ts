import { handle, json, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';

// Registry-first mention autocomplete: users I have mentioned before (top),
// falling back to any matching account.
export const GET = handle(async (req) => {
  const me = await requireUser();
  const prefix = new URL(req.url).searchParams.get('q')?.trim().toLowerCase() ?? '';
  const min = new URL(req.url).searchParams.get('min') === '1' ? 1 : 2;
  if (prefix.length < min) return json({ users: [] });

  const mentioned = await prisma.tweetMention.findMany({
    where: {
      mentioned: {
        is: { OR: [{ username: { startsWith: prefix, mode: 'insensitive' } }, { name: { startsWith: prefix, mode: 'insensitive' } }] },
      },
    },
    distinct: ['mentionedId'],
    take: 6,
    select: {
      mentioned: {
        select: { id: true, username: true, name: true, avatarId: true, profilePhotoId: true, bio: true, _count: { select: { tweets: true, tweetFollowers: true } } },
      },
    },
  }) as any[];

  const registryUsers = mentioned.map((m: any) => m.mentioned);

  const missing = 6 - registryUsers.length;
  if (missing > 0) {
    const rows = await prisma.user.findMany({
      where: {
        AND: [
          { NOT: { id: { in: [...registryUsers.map((u: any) => u.id), me.id] } } },
          { OR: [{ username: { startsWith: prefix, mode: 'insensitive' } }, { name: { startsWith: prefix, mode: 'insensitive' } }] },
        ],
      },
      take: missing,
      select: { id: true, username: true, name: true, avatarId: true, profilePhotoId: true, bio: true, _count: { select: { tweets: true, tweetFollowers: true } } },
    });
    registryUsers.push(...rows);
  }

  return json({
    users: registryUsers.map((u: any) => ({
      id: u.id,
      username: u.username,
      name: u.name,
      avatarId: u.avatarId,
      avatarPhoto: u.profilePhotoId ? `/api/media/${u.profilePhotoId}` : null,
      bio: u.bio,
      tweets: u._count?.tweets ?? 0,
      followers: u._count?.tweetFollowers ?? 0,
    })),
  });
});