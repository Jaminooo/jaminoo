import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { serializeTweetAuthor } from '@/lib/tweet';
import { TWEET_ACTOR_SELECT } from '@/lib/tweet-db';

const PROFILE_SELECT = {
  ...TWEET_ACTOR_SELECT.select,
  createdAt: true,
  github: true,
  isPrivate: true,
};

export const GET = handle(async (req) => {
  const me = await requireUser();
  const username = new URL(req.url).searchParams.get('username')?.trim() ?? '';
  if (!username) return err('A username is required');

  const user = await prisma.user.findUnique({
    where: { username },
    select: PROFILE_SELECT,
  });
  if (!user) return err('User not found', 404);

  const [tweets, replies, media, likes, following, followers, amFollowing, blockRow, blockedByRow, muteRow, requestRow] = await Promise.all([
    prisma.tweet.count({ where: { authorId: user.id, visibility: 'PUBLIC', replyToId: null } }),
    prisma.tweet.count({ where: { authorId: user.id, visibility: 'PUBLIC', replyToId: { not: null } } }),
    prisma.tweetAsset.count({ where: { tweet: { authorId: user.id, visibility: 'PUBLIC' } } }),
    prisma.tweetLike.count({ where: { tweet: { authorId: user.id, visibility: 'PUBLIC' } } }),
    prisma.tweetFollow.count({ where: { followerId: user.id } }),
    prisma.tweetFollow.count({ where: { followingId: user.id } }),
    prisma.tweetFollow.findUnique({ where: { followerId_followingId: { followerId: me.id, followingId: user.id } }, select: { id: true } }),
    prisma.tweetBlock.findUnique({ where: { blockerId_blockedId: { blockerId: me.id, blockedId: user.id } }, select: { id: true } }),
    prisma.tweetBlock.findUnique({ where: { blockerId_blockedId: { blockerId: user.id, blockedId: me.id } }, select: { id: true } }),
    prisma.tweetMute.findUnique({ where: { muterId_mutedId: { muterId: me.id, mutedId: user.id } }, select: { id: true } }),
    prisma.tweetFollowRequest.findUnique({ where: { requesterId_targetId: { requesterId: me.id, targetId: user.id } }, select: { status: true } }),
  ]);

  const isMe = user.id === me.id;
  const locked = !!user.isPrivate && !isMe && !amFollowing;

  return json({
    user: { ...serializeTweetAuthor(user), joinedAt: user.createdAt.toISOString() },
    stats: locked ? { tweets: 0, replies: 0, media: 0, likes: 0, following, followers, likedCount: 0 } : {
      tweets,
      replies,
      media,
      likes,
      following,
      followers,
      likedCount: likes,
    },
    following: !!amFollowing,
    requested: !!requestRow && requestRow.status === 'PENDING',
    locked,
    private: !!user.isPrivate,
    blocked: !!blockRow,
    blockedBy: !!blockedByRow,
    muted: !!muteRow,
    isMe,
  });
});

export const PATCH = handle(async (req) => {
  const me = await requireUser();
  const body = await req.json().catch(() => ({}));

  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 50) : undefined;
  const bio = typeof body.bio === 'string' ? body.bio.trim().slice(0, 160) : undefined;
  const website = typeof body.website === 'string' ? body.website.trim().slice(0, 120) : undefined;
  const location = typeof body.location === 'string' ? body.location.trim().slice(0, 60) : undefined;
  const isPrivate = typeof body.isPrivate === 'boolean' ? body.isPrivate : undefined;

  if (isPrivate === true) {
    // Going private: keep existing relationships, but nothing else changes instantly.
  }
  if (isPrivate === false) {
    // Going public: drop any pending requests that were waiting for this account.
    await prisma.tweetFollowRequest.deleteMany({ where: { targetId: me.id, status: 'PENDING' } });
  }

  let bannerPhotoId: string | undefined | null = undefined;
  if (typeof body.bannerPhotoId === 'string') {
    const media = await prisma.media.findUnique({ where: { id: body.bannerPhotoId }, select: { id: true, userId: true, kind: true } });
    if (!media || media.userId !== me.id) return err('Banner image not found', 404);
    if (!media.kind.startsWith('IMAGE')) return err('Banner must be a photo');
    bannerPhotoId = media.id;
  } else if (body.bannerPhotoId === null) {
    bannerPhotoId = null;
  }

  const updated = await prisma.user.update({
    where: { id: me.id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(bio !== undefined ? { bio } : {}),
      ...(website !== undefined ? { website } : {}),
      ...(location !== undefined ? { location } : {}),
      ...(isPrivate !== undefined ? { isPrivate } : {}),
      ...(bannerPhotoId !== undefined ? { bannerPhotoId } : {}),
    },
    select: PROFILE_SELECT,
  });
  return json({ user: { ...serializeTweetAuthor(updated), joinedAt: updated.createdAt.toISOString() } });
});