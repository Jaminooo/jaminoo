import { prisma } from '@/lib/prisma';

export function animePositionMs(jam: {
  currentAnimePlaying: boolean;
  currentAnimePosition: number;
  currentAnimeStartedAt: Date | null;
}) {
  if (jam.currentAnimePlaying && jam.currentAnimeStartedAt) {
    return jam.currentAnimePosition + (Date.now() - jam.currentAnimeStartedAt.getTime());
  }
  return jam.currentAnimePosition;
}

export function animeEpisodePayload(episode: any) {
  if (!episode) return null;
  return {
    id: episode.id,
    animeId: episode.animeId,
    title: episode.title,
    number: episode.number,
    slug: episode.slug,
    externalUrl: episode.externalUrl || null,
    thumbnailUrl: episode.thumbnailUrl || null,
    subtitlesUrl: episode.subtitlesUrl || null,
    durationSec: episode.durationSec,
  };
}

export async function jamAnimeState(jamId: string, viewerId: number, viewerIsAdmin: boolean) {
  const jam = await prisma.jam.findUnique({
    where: { id: jamId },
    include: { currentAnimeEpisode: true, members: { select: { userId: true, role: true } } },
  });
  if (!jam) return null;
  const member = jam.members.find((item) => item.userId === viewerId);
  const canControl = jam.ownerId === viewerId || viewerIsAdmin || member?.role === 'MINI_HOST';
  return {
    state: {
      now: animeEpisodePayload(jam.currentAnimeEpisode),
      playing: jam.currentAnimePlaying,
      positionMs: animePositionMs(jam),
      atMs: Date.now(),
      durationSec: jam.currentAnimeEpisode?.durationSec ?? 0,
      canControl,
    },
  };
}

export async function setJamAnimeState({
  jamId,
  viewerId,
  viewerIsAdmin,
  action,
  episodeId,
  position,
}: {
  jamId: string;
  viewerId: number;
  viewerIsAdmin: boolean;
  action: string;
  episodeId?: number;
  position?: number;
}) {
  const jam = await prisma.jam.findUnique({
    where: { id: jamId },
    include: { currentAnimeEpisode: true, members: { select: { userId: true, role: true } } },
  });
  if (!jam) return null;
  if (jam.kind !== 'ANIME') throw new Error('This jam has no anime player');
  const member = jam.members.find((item) => item.userId === viewerId);
  if (!member) throw new Error('You are not in this jam');
  const canControl = jam.ownerId === viewerId || viewerIsAdmin || member.role === 'MINI_HOST';
  if (!canControl) throw new Error('Only the host can control this anime session');

  const update: any = {};
  const hasEpisode = Number.isInteger(episodeId) && (episodeId as number) > 0;
  const selectedId = hasEpisode ? episodeId : undefined;
  if (action === 'load' || (action === 'play' && selectedId)) {
    const episode = await prisma.animeEpisode.findFirst({ where: { id: selectedId, anime: { visibility: 'PUBLIC' } } });
    if (!episode) throw new Error('Anime episode not found');
    update.currentAnimeEpisodeId = episode.id;
    update.currentAnimePosition = Math.max(0, Math.min(episode.durationSec * 1000, Number(position) || 0));
    update.currentAnimePlaying = action === 'play';
    update.currentAnimeStartedAt = action === 'play' ? new Date() : null;
  } else if (action === 'play' || action === 'resume') {
    if (!jam.currentAnimeEpisodeId) throw new Error('Choose an anime episode first');
    update.currentAnimePlaying = true;
    update.currentAnimeStartedAt = new Date();
  } else if (action === 'pause') {
    update.currentAnimePlaying = false;
    update.currentAnimePosition = animePositionMs(jam);
    update.currentAnimeStartedAt = null;
  } else if (action === 'seek') {
    if (!jam.currentAnimeEpisodeId) throw new Error('Choose an anime episode first');
    const durationMs = Math.max(0, (jam.currentAnimeEpisode?.durationSec ?? 0) * 1000);
    const requested = Math.max(0, Number(position) || 0);
    update.currentAnimePosition = durationMs > 0 ? Math.min(durationMs, requested) : requested;
    update.currentAnimeStartedAt = jam.currentAnimePlaying ? new Date() : null;
  } else if (action === 'ended') {
    update.currentAnimePlaying = false;
    update.currentAnimePosition = Math.max(0, (jam.currentAnimeEpisode?.durationSec ?? 0) * 1000);
    update.currentAnimeStartedAt = null;
  } else {
    throw new Error('Invalid anime action');
  }

  await prisma.jam.update({ where: { id: jamId }, data: update });
  return jamAnimeState(jamId, viewerId, viewerIsAdmin);
}
