import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { serializeVideoPost } from '@/lib/video-post';

type Ctx = { params: { id: string } };

export const GET = handle(async (req, { params }: Ctx) => {
  const me = await requireUser();
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return err('Invalid creator', 400);
  const hub = new URL(req.url).searchParams.get('hub')?.toUpperCase() === 'MUSIC' ? 'MUSIC' : 'VIDEO';
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      username: true,
      avatarId: true,
      bio: true,
      profilePhotoId: true,
      creatorApplications: { where: { hub, status: 'APPROVED' }, orderBy: { createdAt: 'desc' }, take: 1 },
      _count: { select: { creatorFollowers: true } },
    },
  });
  if (!user || user.creatorApplications.length === 0) return err('Creator profile not found', 404);
  const application = user.creatorApplications[0];
  const following = await prisma.creatorFollow.count({ where: { followerId: me.id, creatorId: id } });
  const followers = user._count.creatorFollowers;
  let posts: any[] = [];
  if (hub === 'VIDEO') {
    const rows = await prisma.videoPost.findMany({
      where: { authorId: id, visibility: 'PUBLIC' },
      orderBy: { id: 'desc' },
      take: 30,
      include: {
        author: { select: { id: true, username: true, avatarId: true, profilePhotoId: true } },
        asset: { select: { id: true } },
        thumbnailAsset: { select: { id: true } },
        _count: { select: { likes: true, saves: true, comments: true } },
        likes: { where: { userId: me.id }, select: { id: true } },
        saves: { where: { userId: me.id }, select: { id: true } },
      },
    });
    posts = rows.map(serializeVideoPost);
  }
  return json({ creator: {
    id: user.id,
    username: user.username,
    avatarId: user.avatarId,
    avatarPhoto: user.profilePhotoId ? `/api/media/${user.profilePhotoId}` : null,
    channelName: application.channelName,
    handle: application.handle,
    bio: application.bio || user.bio,
    category: application.category,
    links: JSON.parse(application.links || '[]'),
    followers,
    following: following > 0,
    hub,
  }, posts });
});
