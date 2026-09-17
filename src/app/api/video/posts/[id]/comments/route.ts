import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';

type Ctx = { params: { id: string } };

export const GET = handle(async (_req, { params }: Ctx) => {
  await requireUser();
  const postId = Number(params.id);
  if (!Number.isInteger(postId) || postId <= 0) return err('Invalid post', 400);
  const comments = await prisma.videoComment.findMany({
    where: { postId, post: { visibility: 'PUBLIC' } },
    orderBy: { createdAt: 'asc' },
    take: 80,
    include: { user: { select: { id: true, username: true, avatarId: true, profilePhotoId: true } } },
  });
  return json({ comments: comments.map((comment) => ({
    id: comment.id,
    text: comment.text,
    createdAt: comment.createdAt.toISOString(),
    user: {
      id: comment.user.id,
      username: comment.user.username,
      avatarId: comment.user.avatarId,
      avatarPhoto: comment.user.profilePhotoId ? `/api/media/${comment.user.profilePhotoId}` : null,
    },
  })) });
});

export const POST = handle(async (req: Request, { params }: Ctx) => {
  const me = await requireUser();
  const postId = Number(params.id);
  const body = await req.json().catch(() => ({}));
  const text = typeof body.text === 'string' ? body.text.trim().slice(0, 1000) : '';
  if (!Number.isInteger(postId) || postId <= 0) return err('Invalid post', 400);
  if (!text) return err('Write a comment first');
  const post = await prisma.videoPost.findFirst({ where: { id: postId, visibility: 'PUBLIC' }, select: { id: true, authorId: true, title: true } });
  if (!post) return err('Post not found', 404);
  const comment = await prisma.videoComment.create({
    data: { postId, userId: me.id, text },
    include: { user: { select: { id: true, username: true, avatarId: true, profilePhotoId: true } } },
  });
  if (post.authorId !== me.id) await prisma.notification.create({ data: { userId: post.authorId, kind: 'VIDEO_COMMENT', payload: JSON.stringify({ postId, title: post.title, userId: me.id, username: me.username }) } });
  return json({ comment: {
    id: comment.id,
    text: comment.text,
    createdAt: comment.createdAt.toISOString(),
    user: {
      id: comment.user.id,
      username: comment.user.username,
      avatarId: comment.user.avatarId,
      avatarPhoto: comment.user.profilePhotoId ? `/api/media/${comment.user.profilePhotoId}` : null,
    },
  } }, 201);
});
