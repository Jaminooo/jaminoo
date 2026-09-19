import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { serializeVideoPost } from '@/lib/video-post';

async function publishDue(userId: number) {
  await prisma.videoPost.updateMany({ where: { authorId: userId, workflowStatus: 'SCHEDULED', publishAt: { lte: new Date() } }, data: { workflowStatus: 'PUBLISHED', visibility: 'PUBLIC', publishAt: null } });
}
export const GET = handle(async () => {
  const me = await requireUser();
  await publishDue(me.id);
  const posts = await prisma.videoPost.findMany({ where: { authorId: me.id }, orderBy: { updatedAt: 'desc' }, take: 100, include: { author: { select: { id: true, username: true, avatarId: true, profilePhotoId: true } }, asset: { select: { id: true } }, thumbnailAsset: { select: { id: true } }, _count: { select: { likes: true, saves: true, comments: true } }, likes: { where: { userId: me.id }, select: { id: true } }, saves: { where: { userId: me.id }, select: { id: true } } } });
  return json({ posts: posts.map((post) => ({ ...serializeVideoPost(post), workflowStatus: post.workflowStatus, publishAt: post.publishAt?.toISOString() ?? null, visibility: post.visibility })) });
});
export const PATCH = handle(async (req: Request) => {
  const me = await requireUser();
  const body = await req.json().catch(() => ({}));
  const id = Number(body.id);
  const status = typeof body.workflowStatus === 'string' ? body.workflowStatus.toUpperCase() : '';
  if (!Number.isInteger(id) || id <= 0 || !['DRAFT', 'SCHEDULED', 'PUBLISHED'].includes(status)) return err('Invalid creator workflow update');
  const existing = await prisma.videoPost.findFirst({ where: { id, authorId: me.id }, select: { id: true } });
  if (!existing) return err('Post not found', 404);
  const publishAt = body.publishAt ? new Date(String(body.publishAt)) : null;
  if (status === 'SCHEDULED' && (!publishAt || Number.isNaN(publishAt.getTime()) || publishAt.getTime() <= Date.now())) return err('Choose a future publish time');
  const post = await prisma.videoPost.update({ where: { id }, data: { workflowStatus: status, visibility: status === 'PUBLISHED' ? 'PUBLIC' : 'PRIVATE', publishAt: status === 'SCHEDULED' ? publishAt : null }, include: { author: { select: { id: true, username: true, avatarId: true, profilePhotoId: true } }, asset: { select: { id: true } }, thumbnailAsset: { select: { id: true } }, _count: { select: { likes: true, saves: true, comments: true } }, likes: { where: { userId: me.id }, select: { id: true } }, saves: { where: { userId: me.id }, select: { id: true } } } });
  return json({ post: { ...serializeVideoPost(post), workflowStatus: post.workflowStatus, publishAt: post.publishAt?.toISOString() ?? null, visibility: post.visibility } });
});
