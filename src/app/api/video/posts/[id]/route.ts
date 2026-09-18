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

export const PATCH = handle(async (req, { params }: Ctx) => {
  const me = await requireUser();
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return err('Invalid post', 400);
  const post = await prisma.videoPost.findUnique({ where: { id }, select: { id: true, authorId: true } });
  if (!post) return err('Post not found', 404);
  if (post.authorId !== me.id && !me.isAdmin) return err('Forbidden', 403);
  const body = await req.json().catch(() => ({}));
  const safeUrl = (value: unknown, max = 1200) => {
    if (typeof value !== 'string' || !value.trim()) return '';
    const candidate = value.trim().slice(0, max);
    try {
      const parsed = new URL(candidate);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? candidate : '';
    } catch {
      return '';
    }
  };
  const data: {
    title?: string;
    description?: string;
    thumbnailUrl?: string;
    subtitlesUrl?: string;
    visibility?: string;
  } = {};
  if (body.title !== undefined) data.title = typeof body.title === 'string' ? body.title.trim().slice(0, 180) : '';
  if (body.description !== undefined) data.description = typeof body.description === 'string' ? body.description.trim().slice(0, 5000) : '';
  if (body.thumbnailUrl !== undefined) data.thumbnailUrl = safeUrl(body.thumbnailUrl);
  if (body.subtitlesUrl !== undefined) data.subtitlesUrl = safeUrl(body.subtitlesUrl);
  if (body.visibility !== undefined && ['PUBLIC', 'PRIVATE'].includes(body.visibility) && post.authorId === me.id) data.visibility = body.visibility;
  if (Object.keys(data).length === 0) return err('Nothing to update');
  const updated = await prisma.videoPost.update({
    where: { id },
    data,
    include: {
      author: { select: { id: true, username: true, avatarId: true, profilePhotoId: true } },
      asset: { select: { id: true } },
      thumbnailAsset: { select: { id: true } },
      _count: { select: { likes: true, saves: true, comments: true } },
      likes: { where: { userId: me.id }, select: { id: true } },
      saves: { where: { userId: me.id }, select: { id: true } },
    },
  });
  return json({ post: serializeVideoPost(updated) });
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
