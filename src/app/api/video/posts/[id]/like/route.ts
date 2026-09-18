import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { liveBroadcast } from '@/lib/live-publish';

type Ctx = { params: { id: string } };

export const POST = handle(async (_req, { params }: Ctx) => {
  const me = await requireUser();
  const postId = Number(params.id);
  if (!Number.isInteger(postId) || postId <= 0) return err('Invalid post', 400);
  const post = await prisma.videoPost.findFirst({ where: { id: postId, visibility: 'PUBLIC' }, select: { id: true, authorId: true, title: true } });
  if (!post) return err('Post not found', 404);
  const existing = await prisma.videoLike.findUnique({ where: { postId_userId: { postId, userId: me.id } } });
  if (existing) await prisma.videoLike.delete({ where: { id: existing.id } });
  else {
    await prisma.videoLike.create({ data: { postId, userId: me.id } });
    if (post.authorId !== me.id) await prisma.notification.create({ data: { userId: post.authorId, kind: 'VIDEO_LIKE', payload: JSON.stringify({ postId, title: post.title, userId: me.id, username: me.username }) } });
  }
  const likes = await prisma.videoLike.count({ where: { postId } });
  liveBroadcast('posts:interact', { postId, likes });
  return json({ liked: !existing, likes });
});
