import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { pubUser } from '@/lib/users';

const USER_SELECT = {
  id: true,
  username: true,
  avatarId: true,
  bio: true,
  github: true,
  githubLogin: true,
  status: true,
  statusText: true,
  createdAt: true,
  profilePhotoId: true,
} as const;

type Ctx = { params: { id: string } };

// GET /api/users/[id]/profile — full public profile + relationship to me
export const GET = handle(async (_req, { params }: Ctx) => {
  const me = await requireUser();
  const id = Number(params.id);
  if (!Number.isInteger(id)) return err('Invalid user', 404);

  const user = await prisma.user.findUnique({ where: { id }, select: USER_SELECT });
  if (!user) return err('No such user', 404);

  const friend = await prisma.friendRequest.findFirst({
    where: {
      OR: [
        { fromId: me.id, toId: id },
        { fromId: id, toId: me.id },
      ],
    },
  });

  let relationship: 'me' | 'friends' | 'sent' | 'received' | 'none' = 'none';
  if (id === me.id) relationship = 'me';
  else if (friend?.status === 'FRIENDS') relationship = 'friends';
  else if (friend) relationship = friend.fromId === me.id ? 'sent' : 'received';

  const [ownedJams, friendsCount, jamMsgCount, myFriends, theirFriends, videoPostCount, tweetCount, playlistCount, jamList, jamMemberships] = await Promise.all([
    prisma.jam.count({ where: { ownerId: id } }),
    prisma.friendRequest.count({ where: { status: 'FRIENDS', OR: [{ fromId: id }, { toId: id }] } }),
    prisma.jamMessage.count({ where: { userId: id } }),
    prisma.friendRequest.findMany({ where: { status: 'FRIENDS', OR: [{ fromId: me.id }, { toId: me.id }] }, select: { fromId: true, toId: true } }),
    prisma.friendRequest.findMany({ where: { status: 'FRIENDS', OR: [{ fromId: id }, { toId: id }] }, select: { fromId: true, toId: true } }),
    prisma.videoPost.count({ where: { authorId: id, visibility: 'PUBLIC', workflowStatus: 'PUBLISHED' } }),
    prisma.tweet.count({ where: { authorId: id, visibility: 'PUBLIC' } }),
    prisma.videoPlaylist.count({ where: { userId: id } }),
    prisma.jam.findMany({
      where: { ownerId: id },
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: { id: true, name: true, kind: true, type: true, createdAt: true },
    }),
    prisma.jamMember.count({ where: { userId: id } }),
  ]);

  const mySet = new Set<number>();
  myFriends.forEach((f) => { mySet.add(f.fromId); mySet.add(f.toId); });
  mySet.delete(me.id);
  const theirSet = new Set<number>();
  theirFriends.forEach((f) => { theirSet.add(f.fromId); theirSet.add(f.toId); });
  theirSet.delete(id);
  let mutual = 0;
  for (const uid of mySet) if (theirSet.has(uid)) mutual++;

  const jamListPayload = jamList.map((j) => ({
    id: j.id,
    name: j.name,
    kind: j.kind,
    type: j.type,
    createdAt: j.createdAt.toISOString(),
  }));

  return json({
    user: pubUser(user),
    relationship,
    requestId: friend?.status === 'FRIENDS' ? null : (friend?.id ?? null),
    ownedJams,
    friendsCount,
    jamMsgCount,
    mutual,
    videoPostCount,
    tweetCount,
    playlistCount,
    jamMemberships,
    jamList: jamListPayload,
  });
});