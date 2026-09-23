import { handle, json, err } from '@/lib/api';
import { requireHubAdmin } from '@/lib/roles';
import { prisma } from '@/lib/prisma';
import { parseQualitySources } from '@/lib/watch-select';
import { pushAdminEvent } from '@/lib/admin';
import { liveBroadcast } from '@/lib/live-publish';

const ADMIN_SCOPE = 'CINEMA';
type Ctx = { params: { id: string; eid: string } };
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

export const PATCH = handle(async (req, { params }: Ctx) => {
  await requireHubAdmin(ADMIN_SCOPE);
  const id = Number(params.id), eid = Number(params.eid);
  if (!Number.isInteger(id) || id <= 0 || !Number.isInteger(eid) || eid <= 0) return err('Invalid series episode', 400);
  const existing = await prisma.cinemaEpisode.findFirst({ where: { id: eid, cinemaVideoId: id } });
  if (!existing) return err('Episode not found', 404);
  const body = await req.json().catch(() => ({}));
  const data: any = {};
  if (body.season !== undefined) { const n = int(body.season, 1, 999); if (!n) return err('Invalid season'); data.season = n; }
  if (body.number !== undefined) { const n = int(body.number, 1, 9999); if (!n) return err('Invalid episode number'); data.number = n; }
  if (typeof body.title === 'string') data.title = body.title.trim().slice(0, 180);
  if (typeof body.externalUrl === 'string') data.externalUrl = safeUrl(body.externalUrl);
  if (body.qualitySources !== undefined) data.qualitySources = JSON.stringify(parseQualitySources(body.qualitySources));
  if (typeof body.thumbnailUrl === 'string') data.thumbnailUrl = safeUrl(body.thumbnailUrl, 1200);
  if (typeof body.subtitlesUrl === 'string') data.subtitlesUrl = safeUrl(body.subtitlesUrl, 1200);
  if (body.durationSec !== undefined) data.durationSec = int(body.durationSec, 0, 86400);
  const item = await prisma.cinemaEpisode.update({ where: { id: eid }, data });
  pushAdminEvent('cinema', `Episode S${item.season}E${item.number} updated: ${item.title}`);
  liveBroadcast('cinema:update', { action: 'episode-update', cinemaId: id, episodeId: item.id });
  return json({ episode: payload(item) });
});

export const DELETE = handle(async (_req, { params }: Ctx) => {
  await requireHubAdmin(ADMIN_SCOPE);
  const id = Number(params.id), eid = Number(params.eid);
  if (!Number.isInteger(id) || id <= 0 || !Number.isInteger(eid) || eid <= 0) return err('Invalid series episode', 400);
  const existing = await prisma.cinemaEpisode.findFirst({ where: { id: eid, cinemaVideoId: id } });
  if (!existing) return err('Episode not found', 404);
  await prisma.cinemaEpisode.delete({ where: { id: eid } });
  pushAdminEvent('cinema', `Episode S${existing.season}E${existing.number} removed: ${existing.title}`);
  liveBroadcast('cinema:update', { action: 'episode-remove', cinemaId: id, episodeId: eid });
  return json({ ok: true });
});
