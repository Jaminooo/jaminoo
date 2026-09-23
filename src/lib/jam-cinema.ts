import { prisma } from '@/lib/prisma';
import { parseQualitySources } from '@/lib/watch-select';

export function liveCinemaPositionMs(jam: { currentCinemaPlaying: boolean; currentCinemaPosition: number; currentCinemaStartedAt: Date | null }) {
  if (jam.currentCinemaPlaying && jam.currentCinemaStartedAt) {
    return jam.currentCinemaPosition + (Date.now() - jam.currentCinemaStartedAt.getTime());
  }
  return jam.currentCinemaPosition;
}

export function cinemaPayload(video: any) {
  if (!video) return null;
  return {
    id: video.id,
    title: video.title,
    description: video.description,
    kind: video.kind,
    externalUrl: video.externalUrl || null,
    qualitySources: parseQualitySources(video.qualitySources),
    thumbnailUrl: video.thumbnailUrl || null,
    subtitlesUrl: video.subtitlesUrl || null,
    durationSec: video.durationSec,
    visibility: video.visibility || 'PUBLIC',
  };
}

export async function jamCinemaState(jamId: string, viewerId: number, viewerIsAdmin: boolean) {
  const jam = await prisma.jam.findUnique({
    where: { id: jamId },
    include: { currentCinemaVideo: true, members: { select: { userId: true, role: true } } },
  });
  if (!jam) return null;
  const member = jam.members.find((item) => item.userId === viewerId);
  const canControl = jam.ownerId === viewerId || viewerIsAdmin || member?.role === 'MINI_HOST';
  return {
    state: {
      now: cinemaPayload(jam.currentCinemaVideo),
      playing: jam.currentCinemaPlaying,
      positionMs: liveCinemaPositionMs(jam),
      atMs: Date.now(),
      durationSec: jam.currentCinemaVideo?.durationSec ?? 0,
      canControl,
    },
  };
}

export async function setJamCinemaState({
  jamId,
  viewerId,
  viewerIsAdmin,
  action,
  videoId,
  position,
}: {
  jamId: string;
  viewerId: number;
  viewerIsAdmin: boolean;
  action: string;
  videoId?: number;
  position?: number;
}) {
  const jam = await prisma.jam.findUnique({
    where: { id: jamId },
    include: { currentCinemaVideo: true, members: { select: { userId: true, role: true } } },
  });
  if (!jam) return null;
  if (jam.kind !== 'MOVIE') throw new Error('This jam has no cinema player');
  const member = jam.members.find((item) => item.userId === viewerId);
  if (!member) throw new Error('You are not in this jam');
  const canControl = jam.ownerId === viewerId || viewerIsAdmin || member.role === 'MINI_HOST';
  if (!canControl) throw new Error('Only the host can control this cinema');

  const update: any = {};
  const selectedId = Number.isInteger(videoId) && (videoId as number) > 0 ? videoId : undefined;
  if (action === 'load' || (action === 'play' && selectedId)) {
    const video = await prisma.cinemaVideo.findFirst({ where: { id: selectedId, visibility: 'PUBLIC' } });
    if (!video) throw new Error('Cinema video not found');
    update.currentCinemaVideoId = video.id;
    update.currentCinemaPosition = Math.max(0, Math.min(video.durationSec * 1000, Number(position) || 0));
    update.currentCinemaPlaying = action === 'play';
    update.currentCinemaStartedAt = action === 'play' ? new Date() : null;
  } else if (action === 'play' || action === 'resume') {
    if (!jam.currentCinemaVideoId) throw new Error('Choose a cinema video first');
    update.currentCinemaPlaying = true;
    update.currentCinemaStartedAt = new Date();
  } else if (action === 'pause') {
    update.currentCinemaPlaying = false;
    update.currentCinemaPosition = liveCinemaPositionMs(jam);
    update.currentCinemaStartedAt = null;
  } else if (action === 'seek') {
    if (!jam.currentCinemaVideoId) throw new Error('Choose a cinema video first');
    const durationMs = Math.max(0, (jam.currentCinemaVideo?.durationSec ?? 0) * 1000);
    const requested = Math.max(0, Number(position) || 0);
    update.currentCinemaPosition = durationMs > 0 ? Math.min(durationMs, requested) : requested;
    update.currentCinemaStartedAt = jam.currentCinemaPlaying ? new Date() : null;
  } else if (action === 'ended') {
    update.currentCinemaPlaying = false;
    update.currentCinemaPosition = Math.max(0, (jam.currentCinemaVideo?.durationSec ?? 0) * 1000);
    update.currentCinemaStartedAt = null;
  } else {
    throw new Error('Invalid cinema action');
  }

  await prisma.jam.update({ where: { id: jamId }, data: update });
  return jamCinemaState(jamId, viewerId, viewerIsAdmin);
}
