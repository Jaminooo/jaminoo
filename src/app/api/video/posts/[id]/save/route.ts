import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { liveBroadcast } from '@/lib/live-publish';

type Ctx = { params: { id: string } };

export const POST = handle(async (_req, { params }: Ctx) => {
  const me = await requireUser();
  const postId = Number(params.id);
  if (!Number.isInteger(postId) || postId <= 0) return err('Invalid post', 400);
  const post = await prisma.videoPost.findFirst({ where: { id: postId, visibility: 'PUBLIC' }, select: { id: true } });
  if (!post) return err('Post not found', 404);
  const existing = await prisma.videoSave.findUnique({ where: { postId_userId: { postId, userId: me.id } } });
  if (existing) await prisma.videoSave.delete({ where: { id: existing.id } });
  else await prisma.videoSave.create({ data: { postId, userId: me.id } });
  const saves = await prisma.videoSave.count({ where: { postId } });
  liveBroadcast('posts:interact', { postId, saves });
  return json({ saved: !existing, saves });
});
