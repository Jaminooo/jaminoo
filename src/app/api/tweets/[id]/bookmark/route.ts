import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';

type Ctx = { params: { id: string } };

export const POST = handle(async (req, { params }: Ctx) => {
  const me = await requireUser();
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return err('Invalid tweet', 400);
  const tweet = await prisma.tweet.findUnique({ where: { id }, select: { id: true, visibility: true } });
  if (!tweet || tweet.visibility !== 'PUBLIC') return err('Tweet not found', 404);

  const body = await req.json().catch(() => ({}));
  const collectionId = Number.isInteger(body.collectionId) ? body.collectionId : null;

  const existing = await prisma.tweetBookmark.findUnique({ where: { tweetId_userId: { tweetId: id, userId: me.id } } });
  if (existing) {
    await prisma.tweetBookmark.delete({ where: { id: existing.id } });
  } else {
    await prisma.tweetBookmark.create({ data: { tweetId: id, userId: me.id, ...(collectionId ? { collectionId } : {}) } });
  }
  const saved = await prisma.tweetBookmark.count({ where: { tweetId: id } });
  return json({ saved: !existing, saves: saved });
});

// Attach an existing bookmark to a collection (or clear it with null).
export const PUT = handle(async (req, { params }: Ctx) => {
  const me = await requireUser();
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return err('Invalid tweet', 400);
  const body = await req.json().catch(() => ({}));
  const collectionId = Number.isInteger(body.collectionId) ? body.collectionId : null;

  const bookmark = await prisma.tweetBookmark.findUnique({ where: { tweetId_userId: { tweetId: id, userId: me.id } } });
  if (!bookmark) return err('Tweet is not saved', 404);
  if (collectionId) {
    const collection = await prisma.tweetBookmarkCollection.findUnique({ where: { id: collectionId } });
    if (!collection) return err('Collection not found', 404);
    if (collection.ownerId !== me.id) return err('Not your collection', 403);
  }
  await prisma.tweetBookmark.update({ where: { id: bookmark.id }, data: { collectionId } });
  return json({ ok: true, collectionId });
});