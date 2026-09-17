import { handle, json, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { songPayload } from '@/lib/music-cms';

export const GET = handle(async () => {
  const me = await requireUser();
  const friendships = await prisma.friendRequest.findMany({ where: { status: 'FRIENDS', OR: [{ fromId: me.id }, { toId: me.id }] }, select: { fromId: true, toId: true } });
  const friendIds = friendships.map((row) => row.fromId === me.id ? row.toId : row.fromId);
  const [friends, jams, posts, songs] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: friendIds }, status: { not: 'OFFLINE' } }, select: { id: true, username: true, avatarId: true, profilePhotoId: true, status: true, statusText: true }, orderBy: { username: 'asc' }, take: 18 }),
    prisma.jam.findMany({ where: { type: 'PUBLIC', closed: false }, orderBy: { createdAt: 'desc' }, take: 8, include: { owner: { select: { id: true, username: true, avatarId: true, profilePhotoId: true } }, _count: { select: { members: true } } } }),
    prisma.videoPost.findMany({ where: { visibility: 'PUBLIC' }, orderBy: { id: 'desc' }, take: 8, include: { author: { select: { id: true, username: true, avatarId: true, profilePhotoId: true } }, _count: { select: { likes: true, saves: true, comments: true } } } }),
    prisma.song.findMany({ orderBy: { plays: 'desc' }, take: 8, include: { artist: true, album: true } }),
  ]);
  return json({
    friends: friends.map((friend) => ({ ...friend, avatarPhoto: friend.profilePhotoId ? `/api/media/${friend.profilePhotoId}` : null })),
    jams: jams.map((jam) => ({ id: jam.id, name: jam.name, kind: jam.kind, desc: jam.desc, members: jam._count.members, owner: { ...jam.owner, avatarPhoto: jam.owner.profilePhotoId ? `/api/media/${jam.owner.profilePhotoId}` : null } })),
    posts: posts.map((post) => ({ id: post.id, title: post.title, description: post.description, kind: post.kind, author: { ...post.author, avatarPhoto: post.author.profilePhotoId ? `/api/media/${post.author.profilePhotoId}` : null }, likes: post._count.likes, comments: post._count.comments })),
    songs: songs.map(songPayload),
  });
});
