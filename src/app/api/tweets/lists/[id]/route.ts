import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { serializeTweet, serializeTweetAuthor } from '@/lib/tweet';
import { tweetIncludes, hiddenAuthorIds } from '@/lib/tweet-db';

export const GET = handle(async (req, { params }) => {
  const me = await requireUser();
  const id = Number(params.id);
  const list = await prisma.tweetList.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, username: true, name: true, avatarId: true, profilePhotoId: true } },
    },
  });
  if (!list) return err('List not found', 404);
  const canManage = list.ownerId === me.id;
  if (list.isPrivate && !canManage) return err('List not found', 404);

  const [members, curated] = await Promise.all([
    prisma.tweetListMember.findMany({ where: { listId: id }, include: { member: true }, take: 100 }),
    prisma.tweetListTweet.findMany({ where: { listId: id }, include: { tweet: { select: { id: true } } }, take: 500 }),
  ]);

  const memberIds = members.map((m) => m.memberId);
  const curatedIds = curated.map((c) => c.tweetId);
  const hidden = await hiddenAuthorIds(me.id);
  const followingMe = await prisma.tweetFollow.findMany({
    where: { followerId: me.id },
    select: { followingId: true },
  });

  const tweets = await prisma.tweet.findMany({
    where: {
      AND: [
        { OR: [{ authorId: { in: memberIds } }, { id: { in: curatedIds } }] },
        {
          author: {
            is: {
              OR: [
                { isPrivate: false },
                { id: me.id },
                { id: { in: followingMe.map((f) => f.followingId) } },
              ],
            },
          },
        },
        { authorId: { notIn: hidden } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 40,
    include: tweetIncludes(me.id),
  });

  const myRetweets = tweets.length > 0
    ? await prisma.tweet.findMany({ where: { retweetOfId: { in: tweets.map((t) => t.id) }, authorId: me.id }, select: { retweetOfId: true } })
    : [];
  const retweetedSet = new Set(myRetweets.map((r) => r.retweetOfId));

  return json({
    list: {
      id: list.id,
      name: list.name,
      description: list.description,
      isPrivate: list.isPrivate,
      createdAt: list.createdAt.toISOString(),
      owner: serializeTweetAuthor({ ...list.owner, bio: '', website: '', location: '', isPrivate: false }),
    },
    canManage,
    members: members.map((m) => ({
      ...serializeTweetAuthor(m.member),
      joinedAt: m.createdAt.toISOString(),
    })),
    tweets: tweets.map((t) => serializeTweet(t, retweetedSet.has(t.id))),
    nextCursor: tweets.length === 40 ? String(tweets[tweets.length - 1].id) : null,
  });
});

export const PATCH = handle(async (req, { params }) => {
  const me = await requireUser();
  const id = Number(params.id);
  const list = await prisma.tweetList.findUnique({ where: { id } });
  if (!list) return err('List not found', 404);
  if (list.ownerId !== me.id) return err('Only the list owner can edit this list', 403);

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === 'string' ? body.name.trim() : undefined;
  if (name === '') return err('A list needs a name');
  if (name && name.length > 50) return err('List name is too long');
  const description = typeof body.description === 'string' ? body.description.trim().slice(0, 160) : undefined;
  const isPrivate = 'isPrivate' in body ? body.isPrivate === true : undefined;

  const updated = await prisma.tweetList.update({
    where: { id },
    data: { ...(name !== undefined ? { name } : {}), ...(description !== undefined ? { description } : {}), ...(isPrivate !== undefined ? { isPrivate } : {}) },
  });
  return json({
    list: {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      isPrivate: updated.isPrivate,
      createdAt: updated.createdAt.toISOString(),
    },
  });
});

export const DELETE = handle(async (req, { params }) => {
  const me = await requireUser();
  const id = Number(params.id);
  const list = await prisma.tweetList.findUnique({ where: { id } });
  if (!list) return err('List not found', 404);
  if (list.ownerId !== me.id) return err('Only the list owner can delete this list', 403);

  await prisma.$transaction([
    prisma.tweetListMember.deleteMany({ where: { listId: id } }),
    prisma.tweetListTweet.deleteMany({ where: { listId: id } }),
    prisma.tweetList.delete({ where: { id } }),
  ]);
  return json({ ok: true });
});