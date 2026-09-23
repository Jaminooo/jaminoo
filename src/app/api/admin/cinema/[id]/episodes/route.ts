import { handle, json, err } from '@/lib/api';
import { requireHubAdmin } from '@/lib/roles';
import { prisma } from '@/lib/prisma';
import { parseQualitySources } from '@/lib/watch-select';
import { pushAdminEvent } from '@/lib/admin';
import { liveBroadcast } from '@/lib/live-publish';

const ADMIN_SCOPE = 'CINEMA';
type Ctx = { params: { id: string } };
function int(value: unknown, min: number, max: number) {
  const n = Number(value);
  return Number.isInteger(n) ? Math.max(min, Math.min(max, n)) : 0;
}
function safeUrl(value: unknown, max = 1800) {
  if (typeof value !== 'string' || !value.trim()) return '';
  const url = value.trim().slice(0, max);
  if (/^\/api\/media\/[A-Za-z0-9_-]+$/.test(url) || url === '/defaults/videos/demo.mp4') return url;
  try { const parsed = new URL(url); return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? url : ''; }
  catch { return ''; }
}
function payload(item: any) {
  return { id: item.id, cinemaVideoId: item.cinemaVideoId, season: item.season, number: item.number, title: item.title, externalUrl: item.externalUrl || null, qualitySources: parseQualitySources(item.qualitySources), thumbnailUrl: item.thumbnailUrl || null, subtitlesUrl: item.subtitlesUrl || null, durationSec: item.durationSec };
}

export const GET = handle(async (_req, { params }: Ctx) => {
  await requireHubAdmin(ADMIN_SCOPE);
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return err('Invalid cinema title', 400);
  const title = await prisma.cinemaVideo.findUnique({ where: { id }, select: { id: true, kind: true } });
  if (!title || title.kind !== 'SERIES') return err('Series not found', 404);
  const episodes = await prisma.cinemaEpisode.findMany({ where: { cinemaVideoId: id }, orderBy: [{ season: 'asc' }, { number: 'asc' }] });
  return json({ episodes: episodes.map(payload) });
});

export const POST = handle(async (req, { params }: Ctx) => {
  await requireHubAdmin(ADMIN_SCOPE);
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return err('Invalid cinema title', 400);
  const title = await prisma.cinemaVideo.findUnique({ where: { id }, select: { id: true, kind: true } });
  if (!title || title.kind !== 'SERIES') return err('Series not found', 404);
  const body = await req.json().catch(() => ({}));
  const season = int(body.season ?? 1, 1, 999);
  const number = int(body.number, 1, 9999);
  if (!season || !number) return err('Season and episode number are required');
  const item = await prisma.cinemaEpisode.create({ data: {
    cinemaVideoId: id, season, number,
    title: typeof body.title === 'string' ? body.title.trim().slice(0, 180) : '',
    externalUrl: safeUrl(body.externalUrl), qualitySources: JSON.stringify(parseQualitySources(body.qualitySources)),
    thumbnailUrl: safeUrl(body.thumbnailUrl, 1200), subtitlesUrl: safeUrl(body.subtitlesUrl, 1200),
    durationSec: int(body.durationSec, 0, 86400),
  } });
  pushAdminEvent('cinema', `Episode S${season}E${number} added: ${item.title}`);
  liveBroadcast('cinema:update', { action: 'episode-add', cinemaId: id, episodeId: item.id });
  return json({ episode: payload(item) }, 201);
});
