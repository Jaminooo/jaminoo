import { handle, json, err } from '@/lib/api';
import { requireHubAdmin } from '@/lib/roles';
const ADMIN_SCOPE = 'CINEMA';
import { prisma } from '@/lib/prisma';
import { cinemaPayload } from '@/lib/jam-cinema';
import { pushAdminEvent } from '@/lib/admin';
import { liveBroadcast } from '@/lib/live-publish';
import { parseQualitySources } from '@/lib/watch-select';

type Ctx = { params: { id: string } };

function safeUrl(value: unknown, max = 1800) {
  if (typeof value !== 'string' || !value.trim()) return '';
  const candidate = value.trim().slice(0, max);
  if (/^\/api\/media\/[A-Za-z0-9_-]+$/.test(candidate) || candidate === '/defaults/videos/demo.mp4') return candidate;
  if (/^\/api\/media\/[A-Za-z0-9_-]+$/.test(candidate) || candidate === '/defaults/videos/demo.mp4') return candidate;
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? candidate : '';
  } catch {
    return '';
  }
}

const CINEMA_KIND_LABEL: Record<string, string> = { MOVIE: 'Movie', SERIES: 'Series', CARTOON: 'Cartoon' };

export const PATCH = handle(async (req, { params }: Ctx) => {
  await requireHubAdmin(ADMIN_SCOPE);
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return err('Invalid cinema item', 400);
  const body = await req.json().catch(() => ({}));
  const existing = await prisma.cinemaVideo.findUnique({ where: { id } });
  if (!existing) return err('Cinema item not found', 404);
  const data: any = {};
  if (typeof body.title === 'string' && body.title.trim()) data.title = body.title.trim().slice(0, 180);
  if (typeof body.description === 'string') data.description = body.description.trim().slice(0, 3000);
  if (body.kind === 'MOVIE' || body.kind === 'SERIES' || body.kind === 'CARTOON') data.kind = body.kind;
  if (typeof body.externalUrl === 'string') data.externalUrl = safeUrl(body.externalUrl);
  if (body.qualitySources !== undefined) data.qualitySources = JSON.stringify(parseQualitySources(body.qualitySources));
  if (typeof body.thumbnailUrl === 'string') data.thumbnailUrl = safeUrl(body.thumbnailUrl, 1200);
  if (typeof body.subtitlesUrl === 'string') data.subtitlesUrl = safeUrl(body.subtitlesUrl, 1200);
  if (body.visibility === 'PUBLIC' || body.visibility === 'HIDDEN') data.visibility = body.visibility;
  if (body.durationSec !== undefined) {
    const durationSec = Number(body.durationSec);
    if (!Number.isInteger(durationSec) || durationSec < 0 || durationSec > 86400) return err('Invalid duration');
    data.durationSec = durationSec;
  }
  const item = await prisma.cinemaVideo.update({ where: { id }, data });
  pushAdminEvent('cinema', `${CINEMA_KIND_LABEL[item.kind] ?? 'Movie'} updated: ${item.title}`, { visible: item.visibility === 'PUBLIC' });
  liveBroadcast('cinema:update', { action: 'update', id: item.id, visibility: item.visibility });
  return json({ item: cinemaPayload(item) });
});

export const DELETE = handle(async (_req, { params }: Ctx) => {
  await requireHubAdmin(ADMIN_SCOPE);
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return err('Invalid cinema item', 400);
  const existing = await prisma.cinemaVideo.findUnique({ where: { id } }).catch(() => null);
  await prisma.cinemaVideo.delete({ where: { id } }).catch(() => null);
  if (existing) {
    pushAdminEvent('cinema', `${CINEMA_KIND_LABEL[existing.kind] ?? 'Movie'} removed: ${existing.title}`);
    liveBroadcast('cinema:update', { action: 'remove', id });
  }
  return json({ ok: true });
});
