import { handle, json, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { serializeVideoPost } from '@/lib/video-post';

// Discovery for the Video Hub "Creators" view: lists every approved VIDEO-hub
// creator with their channel info, follower counts and latest published posts.

const userSelect = { id: true, username: true, avatarId: true, profilePhotoId: true } as const;

export const GET = handle(async (req: Request) => {
  const me = await requireUser();
  const params = new URL(req.url).searchParams;
  const query = (params.get('q') ?? '').trim().slice(0, 80);

  const applications = await prisma.creatorApplication.findMany({
    where: {
      hub: 'VIDEO',
      status: 'APPROVED',
      ...(query
        ? {
            OR: [
              { channelName: { contains: query, mode: 'insensitive' as const } },
              { handle: { contains: query, mode: 'insensitive' as const } },
              { category: { contains: query, mode: 'insensitive' as const } },
              { user: { is: { username: { contains: query, mode: 'insensitive' as const } } } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 40,
    include: {
      user: {
        select: {
          ...userSelect,
          _count: { select: { creatorFollowers: true, videoPosts: { where: { visibility: 'PUBLIC' } } } },
        },
      },
    },
  });

  const creatorIds = applications.map((application) => application.userId);
  const follows = creatorIds.length
    ? await prisma.creatorFollow.findMany({ where: { followerId: me.id, creatorId: { in: creatorIds } }, select: { creatorId: true } })
    : [];
  const followingSet = new Set(follows.map((follow) => follow.creatorId));

  const latest = creatorIds.length
    ? await prisma.videoPost.findMany({
        where: { authorId: { in: creatorIds }, visibility: 'PUBLIC' },
        orderBy: { id: 'desc' },
        take: 60,
        include: {
          author: { select: userSelect },
          asset: { select: { id: true } },
          thumbnailAsset: { select: { id: true } },
          _count: { select: { likes: true, saves: true, comments: true } },
          likes: { where: { userId: me.id }, select: { id: true } },
          saves: { where: { userId: me.id }, select: { id: true } },
        },
      })
    : [];

  const latestByAuthor = new Map<number, any[]>();
  for (const post of latest) {
    const list = latestByAuthor.get(post.authorId) ?? [];
    if (list.length < 3) {
      list.push(serializeVideoPost(post));
      latestByAuthor.set(post.authorId, list);
    }
  }

  const creators = applications.map((application) => ({
    id: application.userId,
    username: application.user.username,
    avatarId: application.user.avatarId,
    avatarPhoto: application.user.profilePhotoId ? `/api/media/${application.user.profilePhotoId}` : null,
    channelName: application.channelName,
    handle: application.handle,
    category: application.category,
    bio: application.bio,
    followers: application.user._count.creatorFollowers,
    postCount: application.user._count.videoPosts,
    following: followingSet.has(application.userId),
    latestPosts: latestByAuthor.get(application.userId) ?? [],
  }));

  creators.sort((a, b) => b.followers - a.followers);
  return json({ creators });
});
