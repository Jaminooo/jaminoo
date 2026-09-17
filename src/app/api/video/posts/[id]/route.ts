import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { serializeVideoPost } from '@/lib/video-post';

type Ctx = { params: { id: string } };

async function findPost(id: number, userId: number) {
  return prisma.videoPost.findFirst({
    where: { id, visibility: 'PUBLIC' },
    include: {
      author: { select: { id: true, username: true, avatarId: true, profilePhotoId: true } },
      asset: { select: { id: true } },
      thumbnailAsset: { select: { id: true } },
      _count: { select: { likes: true, saves: true, comments: true } },
      likes: { where: { userId }, select: { id: true } },
      saves: { where: { userId }, select: { id: true } },
    },
  });
}

export const GET = handle(async (_req, { params }: Ctx) => {
  const me = await requireUser();
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return err('Invalid post', 400);
  const post = await findPost(id, me.id);
  if (!post) return err('Post not found', 404);
  return json({ post: serializeVideoPost(post) });
});

export const DELETE = handle(async (_req, { params }: Ctx) => {
  const me = await requireUser();
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return err('Invalid post', 400);
  const post = await prisma.videoPost.findUnique({ where: { id }, select: { id: true, authorId: true } });
  if (!post) return err('Post not found', 404);
  if (post.authorId !== me.id && !me.isAdmin) return err('Forbidden', 403);
  await prisma.videoPost.delete({ where: { id } });
  return json({ ok: true });
});
