import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { serializeTweetAuthor } from '@/lib/tweet';

const LIST_SELECT = {
  id: true,
  name: true,
  description: true,
  isPrivate: true,
  createdAt: true,
  ownerId: true,
  owner: {
    select: { id: true, username: true, name: true, avatarId: true, profilePhotoId: true },
  },
  _count: { select: { members: true, tweets: true } },
} as const;

export const GET = handle(async (req) => {
  const me = await requireUser();
  const view = new URL(req.url).searchParams.get('view') ?? 'mine';

  const mine = await prisma.tweetList.findMany({
    where: { ownerId: me.id },
    select: LIST_SELECT,
    orderBy: { createdAt: 'desc' },
    take: 40,
  });

  let publicLists: typeof mine = [];
  if (view === 'public') {
    const followingIds = await prisma.tweetFollow.findMany({
      where: { followerId: me.id },
      select: { followingId: true },
    });
    publicLists = await prisma.tweetList.findMany({
      where: {
        isPrivate: false,
        ownerId: { not: me.id },
        OR: [
          { ownerId: { in: followingIds.map((f) => f.followingId) } },
          { members: { some: { memberId: me.id } } },
        ],
      },
      select: LIST_SELECT,
      orderBy: { createdAt: 'desc' },
      take: 40,
    });
  }

  const toRow = (list: (typeof mine)[number]) => ({
    id: list.id,
    name: list.name,
    description: list.description,
    isPrivate: list.isPrivate,
    createdAt: list.createdAt.toISOString(),
    ownerId: list.ownerId,
    owner: serializeTweetAuthor({ ...list.owner, bio: '', website: '', location: '', isPrivate: false }),
    memberCount: list._count.members,
    tweetCount: list._count.tweets,
  });

  return json({ mine: mine.map(toRow), public: publicLists.map(toRow) });
});

export const POST = handle(async (req) => {
  const me = await requireUser();
  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name || name.length > 50) return err('A list needs a name (max 50 characters)');
  const description = typeof body.description === 'string' ? body.description.trim().slice(0, 160) : '';
  const isPrivate = body.isPrivate === true;

  const existing = await prisma.tweetList.findUnique({ where: { ownerId_name: { ownerId: me.id, name } } });
  if (existing) return err('You already have a list with that name', 409);

  const list = await prisma.tweetList.create({ data: { ownerId: me.id, name, description, isPrivate }, select: LIST_SELECT });
  return json({
    list: {
      id: list.id,
      name: list.name,
      description: list.description,
      isPrivate: list.isPrivate,
      createdAt: list.createdAt.toISOString(),
      ownerId: list.ownerId,
      owner: serializeTweetAuthor({ ...list.owner, bio: '', website: '', location: '', isPrivate: false }),
      memberCount: list._count.members,
      tweetCount: list._count.tweets,
    },
  }, 201);
});