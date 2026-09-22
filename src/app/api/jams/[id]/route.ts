import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { pubUser } from '@/lib/users';
import { msgPayload } from '@/lib/messages';

type Ctx = { params: { id: string } };

const USER_SELECT = {
  id: true,
  username: true,
  avatarId: true,
  bio: true,
  github: true,
  status: true,
  statusText: true,
  createdAt: true,
  profilePhotoId: true,
  name: true,
  isGuest: true,
} as const;

const SONG_PREVIEW = {
  id: true,
  title: true,
  durationSec: true,
  coverFile: true,
  artist: { select: { id: true, name: true } },
  album: { select: { id: true, title: true, coverFile: true } },
} as const;

function songPreview(s: { id: number; title: string; durationSec: number; coverFile: string | null; artist: { name: string } | null; album: { id: number; coverFile: string | null } | null }) {
  return {
    id: s.id,
    title: s.title,
    artist: s.artist?.name ?? '',
    coverUrl: s.coverFile ? `/api/music/cover/song/${s.id}` : s.album?.coverFile ? `/api/music/cover/album/${s.album.id}` : null,
    durationSec: s.durationSec,
  };
}

export const GET = handle(async (_req, { params }: Ctx) => {
  const me = await requireUser({ allowGuest: true });
  const jam = await prisma.jam.findUnique({
    where: { id: params.id },
    include: {
      members: {
        include: { user: { select: USER_SELECT } },
      },
      messages: {
        include: {
          user: { select: USER_SELECT },
          media: true,
          reactions: true,
        },
        orderBy: { createdAt: 'asc' },
        take: 100,
      },
      currentSong: { include: SONG_PREVIEW },
      queueItems: {
        include: {
          song: { include: SONG_PREVIEW },
          addedByRef: { select: { id: true, username: true, isGuest: true } },
          votes: { select: { userId: true } },
        },
        orderBy: [{ pos: 'asc' }, { createdAt: 'asc' }],
      },
      skipVotes: { select: { userId: true, songId: true } },
    },
  });
  if (!jam) return err('Jam not found', 404);
  const isMember = jam.members.some((m) => m.userId === me.id);
  if (!isMember) return err('You are not in this jam', 403);

  const skipCount = jam.skipVotes.filter((v) => v.songId === jam.currentSongId).length;
  const skipMine = jam.skipVotes.some((v) => v.userId === me.id && v.songId === jam.currentSongId);

  const queue = jam.queueItems.map((qi) => ({
    id: qi.id,
    pos: qi.pos ?? 0,
    song: songPreview(qi.song as never),
    addedBy: { username: qi.addedByRef.username, isGuest: qi.addedByRef.isGuest },
    votes: qi.votes.length,
    createdAt: qi.createdAt.toISOString(),
  }));

  return json({
    jam: {
      id: jam.id,
      name: jam.name,
      desc: jam.desc,
      type: jam.type,
      kind: jam.kind,
      ownerId: jam.ownerId,
      closed: jam.closed,
      createdAt: jam.createdAt.toISOString(),
      members: jam.members.map((m) => ({ ...pubUser(m.user), role: m.role })),
      messages: jam.messages.map((m) => msgPayload(m, me.id)),
      now: jam.currentSong ? songPreview(jam.currentSong as never) : null,
      playing: jam.currentPlaying,
      positionMs: jam.currentPosition,
      startMs: jam.currentStartedAt ? jam.currentStartedAt.getTime() : null,
      durationSec: jam.currentSong?.durationSec ?? 0,
      skipCount,
      skipMine,
      queue,
    },
  });
});