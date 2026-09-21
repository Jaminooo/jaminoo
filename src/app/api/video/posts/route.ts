import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { serializeVideoPost } from '@/lib/video-post';

const KINDS = new Set(['POST', 'SHORT', 'LONG']);
const MEDIA_TYPES = new Set(['TEXT', 'IMAGE', 'VIDEO']);

async function approvedVideoCreator(userId: number) {
  const application = await prisma.creatorApplication.findUnique({
    where: { userId_hub: { userId, hub: 'VIDEO' } },
    select: { status: true },
  });
  return application?.status === 'APPROVED';
}

function safeUrl(value: unknown, max = 1800) {
  if (typeof value !== 'string' || !value.trim()) return '';
  const candidate = value.trim().slice(0, max);
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? candidate : '';
  } catch {
    return '';
  }
}

export const GET = handle(async (req: Request) => {
  const me = await requireUser();
  const params = new URL(req.url).searchParams;
  const requestedKind = (params.get('kind') ?? 'ALL').toUpperCase();
  const cursor = Number(params.get('cursor') ?? 0);
  const savedOnly = params.get('saved') === '1';
  const followingOnly = params.get('following') === '1';
  const authorParam = params.get('authorId') ?? '';
  const authorId = Number(authorParam);
  const query = (params.get('q') ?? '').trim().slice(0, 120);
  const trending = params.get('trending') === '1';
  const where: any = { visibility: 'PUBLIC' };
  if (KINDS.has(requestedKind)) where.kind = requestedKind;
  if (query) {
    where.OR = [
      { title: { contains: query, mode: 'insensitive' } },
      { description: { contains: query, mode: 'insensitive' } },
      { author: { is: { username: { contains: query, mode: 'insensitive' } } } },
    ];
  }
  if (Number.isInteger(cursor) && cursor > 0 && !trending && !query) where.id = { lt: cursor };
  if (savedOnly) where.saves = { some: { userId: me.id } };
  if (followingOnly) where.author = { creatorFollowers: { some: { followerId: me.id } } };
  // Trending sorts by like count, so the cursor pages on rank instead of id;
  // keep id cursor only for the default newest-first ordering.
  if (Number.isInteger(authorId) && authorId > 0) where.authorId = authorId;
  if (authorParam === 'me') where.authorId = me.id;

  const posts = await prisma.videoPost.findMany({
    where,
    orderBy: trending ? [{ likes: { _count: 'desc' } }, { id: 'desc' }] : { id: 'desc' },
    take: 13,
    include: {
      author: { select: { id: true, username: true, avatarId: true, profilePhotoId: true } },
      asset: { select: { id: true } },
      thumbnailAsset: { select: { id: true } },
      _count: { select: { likes: true, saves: true, comments: true } },
      likes: { where: { userId: me.id }, select: { id: true } },
      saves: { where: { userId: me.id }, select: { id: true } },
    },
  });
  const hasMore = posts.length > 12;
  const page = hasMore ? posts.slice(0, 12) : posts;
  return json({ posts: page.map(serializeVideoPost), nextCursor: hasMore ? String(page[page.length - 1].id) : null, hasMore });
});

export const POST = handle(async (req: Request) => {
  const me = await requireUser();
  if (!(await approvedVideoCreator(me.id))) return err('Creator approval is required before publishing', 403);
  const body = await req.json().catch(() => ({}));
  const kind = typeof body.kind === 'string' ? body.kind.toUpperCase() : 'POST';
  const mediaType = typeof body.mediaType === 'string' ? body.mediaType.toUpperCase() : 'TEXT';
  const title = typeof body.title === 'string' ? body.title.trim().slice(0, 180) : '';
  const description = typeof body.description === 'string' ? body.description.trim().slice(0, 5000) : '';
  const assetId = typeof body.assetId === 'string' ? body.assetId.trim() : '';
  const thumbnailAssetId = typeof body.thumbnailAssetId === 'string' ? body.thumbnailAssetId.trim() : '';
  const externalUrl = safeUrl(body.externalUrl);
  const thumbnailUrl = safeUrl(body.thumbnailUrl, 1200);
  const subtitlesUrl = safeUrl(body.subtitlesUrl, 1200);
  const durationSec = Number(body.durationSec ?? 0);
  const publishAt = body.publishAt ? new Date(String(body.publishAt)) : null;
  let workflowStatus: 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' = 'PUBLISHED';
  if (body.workflowStatus === 'DRAFT') workflowStatus = 'DRAFT';
  else if (body.workflowStatus === 'SCHEDULED') workflowStatus = 'SCHEDULED';

  if (!KINDS.has(kind)) return err('Invalid post type');
  if (!MEDIA_TYPES.has(mediaType)) return err('Invalid media type');
  if (!title && !description) return err('Add a title or description');
  if (!Number.isInteger(durationSec) || durationSec < 0 || durationSec > 86400) return err('Invalid duration');
  if ((kind === 'SHORT' || kind === 'LONG') && mediaType !== 'VIDEO') return err('Shorts and long videos must use video media');
  if ((mediaType === 'VIDEO' || mediaType === 'IMAGE') && !assetId && !externalUrl) return err('Choose a file or add a media URL');
  if (workflowStatus === 'SCHEDULED' && (!publishAt || Number.isNaN(publishAt.getTime()) || publishAt.getTime() <= Date.now())) return err('Choose a future publish time');

  let asset: { id: string; userId: number; kind: string } | null = null;
  if (assetId) {
    asset = await prisma.media.findUnique({ where: { id: assetId }, select: { id: true, userId: true, kind: true } });
    if (!asset || asset.userId !== me.id) return err('Media asset not found', 404);
    const expectedKind = mediaType === 'IMAGE' ? 'IMAGE_ASSET' : mediaType === 'VIDEO' ? 'VIDEO_ASSET' : '';
    if (!expectedKind || asset.kind !== expectedKind) return err('The selected file does not match this post type');
    const alreadyAttached = await prisma.videoPost.count({ where: { assetId } });
    if (alreadyAttached > 0) return err('This file is already attached to a post');
  }

  let thumbnailAsset: { id: string; userId: number; kind: string } | null = null;
  if (thumbnailAssetId) {
    thumbnailAsset = await prisma.media.findUnique({ where: { id: thumbnailAssetId }, select: { id: true, userId: true, kind: true } });
    if (!thumbnailAsset || thumbnailAsset.userId !== me.id || thumbnailAsset.kind !== 'IMAGE_ASSET') return err('Thumbnail asset not found', 404);
  }

  const post = await prisma.videoPost.create({
    data: {
      authorId: me.id,
      assetId: asset?.id ?? null,
      thumbnailAssetId: thumbnailAsset?.id ?? null,
      title,
      description,
      kind,
      mediaType,
      externalUrl,
      thumbnailUrl,
      subtitlesUrl,
      durationSec,
      visibility: workflowStatus === 'PUBLISHED' ? 'PUBLIC' : 'PRIVATE',
      workflowStatus,
      publishAt: workflowStatus === 'SCHEDULED' ? publishAt : null,
    },
    include: {
      author: { select: { id: true, username: true, avatarId: true, profilePhotoId: true } },
      asset: { select: { id: true } },
      thumbnailAsset: { select: { id: true } },
      _count: { select: { likes: true, saves: true, comments: true } },
      likes: { where: { userId: me.id }, select: { id: true } },
      saves: { where: { userId: me.id }, select: { id: true } },
    },
  });
  return json({ post: { ...serializeVideoPost(post), workflowStatus: post.workflowStatus, publishAt: post.publishAt?.toISOString() ?? null } }, 201);
});
