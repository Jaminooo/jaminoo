import { prisma } from '@/lib/prisma';
import { songPayload } from '@/lib/music-cms';

export function livePositionMs(jam: { currentPlaying: boolean; currentPosition: number; currentStartedAt: Date | null }) {
  if (jam.currentPlaying && jam.currentStartedAt) {
    return jam.currentPosition + (Date.now() - jam.currentStartedAt.getTime());
  }
  return jam.currentPosition;
}

export async function jamMusicState(jamId: string, viewerId: number, viewerIsAdmin: boolean) {
  const jam = await prisma.jam.findUnique({
    where: { id: jamId },
    include: {
      currentSong: {
        include: {
          artist: { select: { id: true, name: true, coverFile: true } },
          album: { select: { id: true, title: true, coverFile: true } },
        },
      },
      queueItems: {
        include: {
          song: {
            include: {
              artist: { select: { id: true, name: true, coverFile: true } },
              album: { select: { id: true, title: true, coverFile: true } },
            },
          },
          addedByRef: { select: { id: true, username: true } },
          votes: { select: { userId: true } },
        },
        orderBy: [{ pos: 'asc' }, { createdAt: 'asc' }],
      },
      members: { select: { userId: true, role: true } },
    },
  });
  if (!jam) return null;

  const now = jam.currentSong ? songPayload(jam.currentSong) : null;
  const meMember = jam.members.find((m) => m.userId === viewerId);
  const canControl = jam.ownerId === viewerId || viewerIsAdmin || meMember?.role === 'MINI_HOST';

  let skipVotes = 0;
  let skipMine = false;
  if (jam.currentSongId) {
    const votes = await prisma.jamSkipVote.findMany({ where: { jamId, songId: jam.currentSongId }, select: { userId: true } });
    skipVotes = votes.length;
    skipMine = votes.some((v) => v.userId === viewerId);
  }

  return {
    state: {
      now,
      playing: jam.currentPlaying,
      positionMs: livePositionMs(jam),
      atMs: Date.now(),
      durationSec: jam.currentSong?.durationSec ?? 0,
      canControl,
      skipVotes,
      skipMine,
    },
    queue: jam.queueItems.map((qi) => ({
      id: qi.id,
      pos: qi.pos ?? 0,
      song: songPayload(qi.song),
      addedBy: { id: qi.addedBy, username: qi.addedByRef?.username ?? '' },
      createdAt: qi.createdAt.toISOString(),
      votes: qi.votes.length,
      voted: qi.votes.some((vote) => vote.userId === viewerId),
    })),
  };
}
