import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';

type Ctx = { params: { id: string } };

export const POST = handle(async (req, { params }: Ctx) => {
  const me = await requireUser();
  const postId = Number(params.id);
  const body = await req.json().catch(() => ({}));
  const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 500) : 'Reported by member';
  if (!Number.isInteger(postId) || postId <= 0) return err('Invalid post', 400);
  const post = await prisma.videoPost.findFirst({ where: { id: postId, visibility: 'PUBLIC' }, select: { id: true } });
  if (!post) return err('Post not found', 404);
  const existing = await prisma.messageReport.findFirst({ where: { reporterId: me.id, videoPostId: postId, status: 'OPEN' }, select: { id: true } });
  if (existing) return json({ reported: true });
  await prisma.messageReport.create({ data: { reporterId: me.id, videoPostId: postId, reason } });
  return json({ reported: true }, 201);
});
