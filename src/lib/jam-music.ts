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
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  if (!jam) return null;

  const now = jam.currentSong ? songPayload(jam.currentSong) : null;
  const canControl = jam.ownerId === viewerId || viewerIsAdmin;

  return {
    state: {
      now,
      playing: jam.currentPlaying,
      positionMs: livePositionMs(jam),
      atMs: Date.now(),
      durationSec: jam.currentSong?.durationSec ?? 0,
      canControl,
    },
    queue: jam.queueItems.map((qi) => ({
      id: qi.id,
      song: songPayload(qi.song),
      addedBy: { id: qi.addedBy, username: qi.addedByRef?.username ?? '' },
      createdAt: qi.createdAt.toISOString(),
    })),
  };
}