// Shared Tweet Hub query shapes — avoids N+1 and keeps serialization consistent.
import { prisma } from '@/lib/prisma';

export const TWEET_ACTOR_SELECT = {
  select: {
    id: true,
    username: true,
    name: true,
    avatarId: true,
    profilePhotoId: true,
    bannerPhotoId: true,
    bio: true,
    website: true,
    location: true,
  },
};

const QUOTE_NEST_INCLUDE = {
  author: TWEET_ACTOR_SELECT,
  assets: {
    orderBy: { pos: 'asc' as const },
    include: { media: { select: { id: true, mime: true } } },
  },
  poll: { include: { options: { include: { _count: { select: { votes: true } } } } } },
  _count: { select: { likes: true, retweets: true, replies: true } },
};

export function tweetIncludes(userId: number, withQuoted = true) {
  return {
    author: TWEET_ACTOR_SELECT,
    assets: {
      orderBy: { pos: 'asc' as const },
      include: { media: { select: { id: true, mime: true } } },
    },
    replyTo: { select: { id: true, author: TWEET_ACTOR_SELECT } },
    ...(withQuoted ? { quoted: { include: QUOTE_NEST_INCLUDE } } : {}),
    _count: { select: { likes: true, retweets: true, replies: true, quotes: true } },
    likes: { where: { userId }, select: { id: true } },
    bookmarks: { where: { userId }, select: { id: true } },
    pinnedBy: { where: { id: userId }, select: { id: true } },
    poll: {
      include: {
        options: {
          include: {
            _count: { select: { votes: true } },
            votes: { where: { userId }, select: { optionId: true }, take: 1 },
          },
        },
      },
    },
  };
}

// Ids of authors that must not appear in the timeline: users I blocked,
// users who blocked me, and users I muted.
export async function hiddenAuthorIds(userId: number) {
  const [blocksI, blocksAgainstMe, mutes] = await Promise.all([
    prisma.tweetBlock.findMany({ where: { blockerId: userId }, select: { blockedId: true } }),
    prisma.tweetBlock.findMany({ where: { blockedId: userId }, select: { blockerId: true } }),
    prisma.tweetMute.findMany({ where: { muterId: userId }, select: { mutedId: true } }),
  ]);
  return Array.from(
    new Set([
      ...blocksI.map((b) => b.blockedId),
      ...blocksAgainstMe.map((b) => b.blockerId),
      ...mutes.map((m) => m.mutedId),
    ])
  );
}

// Record one deduplicated impression per (tweet, viewer, day). New rows bump
// the cached Tweet.views counter so reads stay cheap.
export async function recordTweetView(tweetId: number, viewerId: number) {
  const day = new Date();
  day.setUTCHours(0, 0, 0, 0);
  const created = await prisma.tweetView.createMany({
    data: [{ tweetId, viewerId, scope: 'unique', day }],
    skipDuplicates: true,
  });
  if (created.count > 0) {
    await prisma.tweet.update({ where: { id: tweetId }, data: { views: { increment: created.count } } });
  }
}

// Is `viewerId` allowed to see content from `authorId`? Private accounts only
// expose their tweets to accepted followers (and themselves).
export async function canViewAuthor(authorId: number, viewerId: number) {
  if (authorId === viewerId) return true;
  const user = await prisma.user.findUnique({ where: { id: authorId }, select: { isPrivate: true } });
  if (!user || !user.isPrivate) return true;
  const follow = await prisma.tweetFollow.findUnique({
    where: { followerId_followingId: { followerId: viewerId, followingId: authorId } },
    select: { id: true },
  });
  return !!follow;
}