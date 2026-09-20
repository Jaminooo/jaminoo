import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { canViewAuthor } from '@/lib/tweet-db';

export const POST = handle(async (req, { params }) => {
  const me = await requireUser();
  const id = Number(params.id);
  const list = await prisma.tweetList.findUnique({ where: { id }, select: { id: true, ownerId: true } });
  if (!list) return err('List not found', 404);
  if (list.ownerId !== me.id) return err('Only the list owner can curate tweets', 403);

  const body = await req.json().catch(() => ({}));
  const tweetId = Number(body.tweetId);
  if (!tweetId) return err('Provide a tweetId');

  const tweet = await prisma.tweet.findUnique({ where: { id: tweetId }, select: { id: true, authorId: true } });
  if (!tweet) return err('Tweet not found', 404);
  if (!(await canViewAuthor(tweet.authorId, me.id))) return err('You cannot add tweets you cannot see', 403);

  await prisma.tweetListTweet.upsert({
    where: { listId_tweetId: { listId: id, tweetId } },
    update: {},
    create: { listId: id, tweetId, addedBy: me.id },
  });
  return json({ ok: true });
});

export const DELETE = handle(async (req, { params }) => {
  const me = await requireUser();
  const id = Number(params.id);
  const list = await prisma.tweetList.findUnique({ where: { id }, select: { id: true, ownerId: true } });
  if (!list) return err('List not found', 404);
  if (list.ownerId !== me.id) return err('Only the list owner can curate tweets', 403);

  const tweetId = Number(new URL(req.url).searchParams.get('tweetId'));
  if (!tweetId) return err('Provide a tweetId');
  await prisma.tweetListTweet.deleteMany({ where: { listId: id, tweetId } });
  return json({ ok: true });
});