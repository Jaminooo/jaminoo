import { handle, json, err } from '@/lib/api';
import { requireHubAdmin } from '@/lib/roles';
import { prisma } from '@/lib/prisma';
import { animeEpisodePayload } from '@/lib/anime';
import { parseQualitySources } from '@/lib/watch-select';
import { pushAdminEvent } from '@/lib/admin';
import { liveBroadcast } from '@/lib/live-publish';

const ADMIN_SCOPE = 'ANIME';
type Ctx = { params: { id: string } };

export const GET = handle(async (_req, { params }: Ctx) => {
  await requireHubAdmin(ADMIN_SCOPE);
  const animeId = Number(params.id);
  if (!Number.isInteger(animeId) || animeId <= 0) return err('Invalid anime', 400);
  const anime = await prisma.anime.findUnique({ where: { id: animeId }, select: { id: true } });
  if (!anime) return err('Anime not found', 404);
  const episodes = await prisma.animeEpisode.findMany({ where: { animeId }, orderBy: [{ season: 'asc' }, { number: 'asc' }, { id: 'asc' }] });
  return json({ episodes: episodes.map(animeEpisodePayload) });
});

function clampInt(v: unknown, min: number, max: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(min, Math.min(max, Math.round(n)));
}

export const POST = handle(async (req, { params }: Ctx) => {
  await requireHubAdmin(ADMIN_SCOPE);
  const animeId = Number(params.id);
  if (!Number.isInteger(animeId) || animeId <= 0) return err('Invalid anime', 400);
  const anime = await prisma.anime.findUnique({ where: { id: animeId }, select: { id: true } });
  if (!anime) return err('Anime not found', 404);
  const body = await req.json().catch(() => ({}));
  const number = clampInt(body.number, 0, 9999);
  const title = typeof body.title === 'string' ? body.title.trim().slice(0, 180) : '';
  if (!number) return err('Episode number is required');
  const slug = typeof body.slug === 'string' ? body.slug.trim().slice(0, 80) : '';
  const item = await prisma.animeEpisode.create({
    data: {
      animeId,
      number,
      season: clampInt(body.season ?? 1, 1, 999),
      slug,
      title,
      externalUrl: typeof body.externalUrl === 'string' ? body.externalUrl.trim().slice(0, 1800) : '',
      qualitySources: JSON.stringify(parseQualitySources(body.qualitySources)),
      thumbnailUrl: typeof body.thumbnailUrl === 'string' ? body.thumbnailUrl.trim().slice(0, 1200) : '',
      subtitlesUrl: typeof body.subtitlesUrl === 'string' ? body.subtitlesUrl.trim().slice(0, 1200) : '',
      durationSec: clampInt(body.durationSec, 0, 86400),
    },
  });
  pushAdminEvent('anime', `Episode #${item.number} added: ${item.title}`);
  liveBroadcast('anime:update', { action: 'episode-add', animeId, episodeId: item.id });
  return json({ episode: animeEpisodePayload(item) }, 201);
});
