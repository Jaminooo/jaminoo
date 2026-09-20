import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';

export const GET = handle(async (_req) => {
  const me = await requireUser();
  const rows = await prisma.tweetBookmarkCollection.findMany({
    where: { ownerId: me.id },
    orderBy: { createdAt: 'asc' },
    include: { _count: { select: { bookmarks: true } } },
  });
  return json({
    collections: rows.map((row) => ({
      id: row.id,
      name: row.name,
      createdAt: row.createdAt.toISOString(),
      count: row._count.bookmarks,
    })),
  });
});

export const POST = handle(async (req) => {
  const me = await requireUser();
  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name || name.length > 40) return err('Folder names are 1–40 characters');
  const existing = await prisma.tweetBookmarkCollection.findUnique({ where: { ownerId_name: { ownerId: me.id, name } } });
  if (existing) return err('You already have a folder with that name', 409);

  const row = await prisma.tweetBookmarkCollection.create({ data: { ownerId: me.id, name } });
  return json({ collection: { id: row.id, name: row.name, createdAt: row.createdAt.toISOString(), count: 0 } }, 201);
});