import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { serializeTweet } from '@/lib/tweet';
import { hiddenAuthorIds } from '@/lib/tweet-db';

export const GET = handle(async (req, { params }) => {
  const me = await requireUser();
  const id = Number(params.id);
  const collection = await prisma.tweetBookmarkCollection.findUnique({ where: { id } });
  if (!collection) return err('Folder not found', 404);
  if (collection.ownerId !== me.id) return err('Not your folder', 403);

  const hidden = await hiddenAuthorIds(me.id);
  const bookmarks = await prisma.tweetBookmark.findMany({
    where: { collectionId: id },
    include: { tweet: true },
    orderBy: { createdAt: 'desc' },
    take: 60,
  });
  const tweets = bookmarks
    .filter((bookmark) => !hidden.includes(bookmark.tweet.authorId))
    .map((bookmark) => serializeTweet(bookmark.tweet));

  return json({
    collection: { id: collection.id, name: collection.name, createdAt: collection.createdAt.toISOString() },
    tweets,
  });
});

export const PATCH = handle(async (req, { params }) => {
  const me = await requireUser();
  const id = Number(params.id);
  const collection = await prisma.tweetBookmarkCollection.findUnique({ where: { id } });
  if (!collection) return err('Folder not found', 404);
  if (collection.ownerId !== me.id) return err('Not your folder', 403);

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name || name.length > 40) return err('Folder names are 1–40 characters');
  const updated = await prisma.tweetBookmarkCollection.update({ where: { id }, data: { name } });
  return json({ collection: { id: updated.id, name: updated.name, createdAt: updated.createdAt.toISOString() } });
});

export const DELETE = handle(async (_req, { params }) => {
  const me = await requireUser();
  const id = Number(params.id);
  const collection = await prisma.tweetBookmarkCollection.findUnique({ where: { id } });
  if (!collection) return err('Folder not found', 404);
  if (collection.ownerId !== me.id) return err('Not your folder', 403);

  await prisma.$transaction([
    prisma.tweetBookmark.updateMany({ where: { collectionId: id }, data: { collectionId: null } }),
    prisma.tweetBookmarkCollection.delete({ where: { id } }),
  ]);
  return json({ ok: true });
});