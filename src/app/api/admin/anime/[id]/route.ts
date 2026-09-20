import { handle, json, err } from '@/lib/api';
import { requireHubAdmin } from '@/lib/roles';
import { prisma } from '@/lib/prisma';
import { animePayload, animeEpisodePayload } from '@/lib/anime';
import { pushAdminEvent } from '@/lib/admin';
import { liveBroadcast } from '@/lib/live-publish';

const ADMIN_SCOPE = 'ANIME';

type Ctx = { params: { id: string } };

function safeUrl(value: unknown, max = 1800) {
  if (typeof value !== 'string' || !value.trim()) return '';
  const candidate = value.trim().slice(0, max);
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? candidate : '';
  } catch {
    return '';
  }
}

function toArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((g): g is string => typeof g === 'string');
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter((g): g is string => typeof g === 'string') : [];
    } catch {
      return value ? [value] : [];
    }
  }
  return [];
}

function clampInt(v: unknown, min: number, max: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function clampRating(v: unknown) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(10, n));
}

export const GET = handle(async (_req, { params }: Ctx) => {
  await requireHubAdmin(ADMIN_SCOPE);
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return err('Invalid anime', 400);
  const anime = await prisma.anime.findUnique({
    where: { id },
    include: { episodes_: { orderBy: [{ number: 'asc' }, { id: 'asc' }] } },
  });
  if (!anime) return err('Anime not found', 404);
  return json({ item: animePayload(anime), episodes: anime.episodes_.map(animeEpisodePayload) });
});

export const PATCH = handle(async (req, { params }: Ctx) => {
  await requireHubAdmin(ADMIN_SCOPE);
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return err('Invalid anime', 400);
  const existing = await prisma.anime.findUnique({ where: { id } });
  if (!existing) return err('Anime not found', 404);
  const body = await req.json().catch(() => ({}));
  const data: any = {};
  if (typeof body.title === 'string' && body.title.trim()) data.title = body.title.trim().slice(0, 180);
  if (typeof body.slug === 'string' && body.slug.trim()) data.slug = body.slug.trim().slice(0, 120);
  if (typeof body.original === 'string') data.original = body.original.trim().slice(0, 180);
  if (typeof body.overview === 'string') data.overview = body.overview.trim().slice(0, 3000);
  if (typeof body.coverFile === 'string') data.coverFile = body.coverFile.trim().slice(0, 300);
  if (typeof body.trailerUrl === 'string') data.trailerUrl = safeUrl(body.trailerUrl, 1200);
  if (['TV', 'MOVIE', 'OVA', 'SPECIAL'].includes(body.type)) data.type = body.type;
  if (['FINISHED', 'AIRING', 'UPCOMING'].includes(body.status)) data.status = body.status;
  if (body.year !== undefined) data.year = clampInt(body.year, 1888, 2100);
  if (body.episodes !== undefined) data.episodes = clampInt(body.episodes, 0, 5000);
  if (body.rating !== undefined) data.rating = clampRating(body.rating);
  if (body.genres !== undefined) data.genres = JSON.stringify(toArray(body.genres));
  if (typeof body.studio === 'string') data.studio = body.studio.trim().slice(0, 120);
  if (body.colorFrom !== undefined) data.colorFrom = clampInt(body.colorFrom, 0, 360);
  if (body.colorTo !== undefined) data.colorTo = clampInt(body.colorTo, 0, 360);
  if (body.visibility === 'PUBLIC' || body.visibility === 'HIDDEN') data.visibility = body.visibility;
  const item = await prisma.anime.update({ where: { id }, data });
  pushAdminEvent('anime', `Anime updated: ${item.title}`);
  liveBroadcast('anime:update', { action: 'update', id: item.id, visibility: item.visibility });
  return json({ item: animePayload(item) });
});

export const DELETE = handle(async (_req, { params }: Ctx) => {
  await requireHubAdmin(ADMIN_SCOPE);
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return err('Invalid anime', 400);
  const existing = await prisma.anime.findUnique({ where: { id } }).catch(() => null);
  if (!existing) return err('Anime not found', 404);
  await prisma.anime.delete({ where: { id } });
  pushAdminEvent('anime', `Anime removed: ${existing.title}`);
  liveBroadcast('anime:update', { action: 'remove', id });
  return json({ ok: true });
});
