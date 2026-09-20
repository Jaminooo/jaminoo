import { handle, json, err } from '@/lib/api';
import { requireHubAdmin } from '@/lib/roles';
import { prisma } from '@/lib/prisma';
import { animePayload } from '@/lib/anime';
import { pushAdminEvent } from '@/lib/admin';
import { liveBroadcast } from '@/lib/live-publish';

const ADMIN_SCOPE = 'ANIME';

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

// GET /api/admin/anime — list (admin)
export const GET = handle(async (req) => {
  await requireHubAdmin(ADMIN_SCOPE);
  const params = new URL(req.url).searchParams;
  const q = (params.get('q') || '').slice(0, 120);
  const type = params.get('type');
  const status = params.get('status');
  const visibility = params.get('visibility') || undefined;
  const where: any = {};
  if (q) where.OR = [{ title: { contains: q, mode: 'insensitive' } }, { slug: { contains: q, mode: 'insensitive' } }];
  if (type) where.type = type;
  if (status) where.status = status;
  if (visibility) where.visibility = visibility;
  const rows = await prisma.anime.findMany({ where, orderBy: { createdAt: 'desc' }, take: 200, include: { _count: { select: { episodes_: true } } } });
  return json({ items: rows.map((a) => ({ ...animePayload(a), episodeCount: a._count.episodes_ })) });
});

// POST /api/admin/anime — create (admin)
export const POST = handle(async (req) => {
  await requireHubAdmin(ADMIN_SCOPE);
  const body = await req.json().catch(() => ({}));
  const title = typeof body.title === 'string' ? body.title.trim().slice(0, 180) : '';
  if (!title) return err('Title is required');
  const slug = (typeof body.slug === 'string' && body.slug.trim()) || slugify(title);
  const anime = await prisma.anime.create({
    data: {
      slug,
      title,
      original: typeof body.original === 'string' ? body.original.trim().slice(0, 180) : '',
      overview: typeof body.overview === 'string' ? body.overview.trim().slice(0, 3000) : '',
      coverFile: typeof body.coverFile === 'string' ? body.coverFile.trim().slice(0, 300) : '',
      trailerUrl: safeUrl(body.trailerUrl, 1200),
      type: ANIME_TYPE_VALUES.includes(body.type) ? body.type : 'TV',
      status: ANIME_STATUS_VALUES.includes(body.status) ? body.status : 'FINISHED',
      year: clampInt(body.year, 1888, 2100),
      episodes: clampInt(body.episodes, 0, 5000),
      rating: clampRating(body.rating),
      genres: JSON.stringify(toArray(body.genres)),
      studio: typeof body.studio === 'string' ? body.studio.trim().slice(0, 120) : '',
      colorFrom: clampInt(body.colorFrom, 0, 360),
      colorTo: clampInt(body.colorTo, 0, 360),
      visibility: body.visibility === 'HIDDEN' ? 'HIDDEN' : 'PUBLIC',
    },
  });
  await prisma.animeEpisode.updateMany({ where: { animeId: anime.id }, data: { animeId: anime.id } });
  pushAdminEvent('anime', `Anime created: ${anime.title}`);
  liveBroadcast('anime:update', { action: 'create', id: anime.id });
  return json({ item: animePayload(anime), episodeCount: anime.episodes }, 201);
});

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
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

const ANIME_TYPE_VALUES = ['TV', 'MOVIE', 'OVA', 'SPECIAL'];
const ANIME_STATUS_VALUES = ['FINISHED', 'AIRING', 'UPCOMING'];
