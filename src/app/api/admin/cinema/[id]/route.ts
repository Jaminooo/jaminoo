import { handle, json, err, requireAdmin } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { cinemaPayload } from '@/lib/jam-cinema';
import { pushAdminEvent } from '@/lib/admin';
import { liveBroadcast } from '@/lib/live-publish';

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

export const PATCH = handle(async (req, { params }: Ctx) => {
  await requireAdmin();
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return err('Invalid cinema item', 400);
  const body = await req.json().catch(() => ({}));
  const existing = await prisma.cinemaVideo.findUnique({ where: { id } });
  if (!existing) return err('Cinema item not found', 404);
  const data: any = {};
  if (typeof body.title === 'string' && body.title.trim()) data.title = body.title.trim().slice(0, 180);
  if (typeof body.description === 'string') data.description = body.description.trim().slice(0, 3000);
  if (body.kind === 'MOVIE' || body.kind === 'SERIES') data.kind = body.kind;
  if (typeof body.externalUrl === 'string') data.externalUrl = safeUrl(body.externalUrl);
  if (typeof body.thumbnailUrl === 'string') data.thumbnailUrl = safeUrl(body.thumbnailUrl, 1200);
  if (typeof body.subtitlesUrl === 'string') data.subtitlesUrl = safeUrl(body.subtitlesUrl, 1200);
  if (body.visibility === 'PUBLIC' || body.visibility === 'HIDDEN') data.visibility = body.visibility;
  if (body.durationSec !== undefined) {
    const durationSec = Number(body.durationSec);
    if (!Number.isInteger(durationSec) || durationSec < 0 || durationSec > 86400) return err('Invalid duration');
    data.durationSec = durationSec;
  }
  const item = await prisma.cinemaVideo.update({ where: { id }, data });
  pushAdminEvent('cinema', `${item.kind === 'MOVIE' ? 'Movie' : 'Series'} updated: ${item.title}`, { visible: item.visibility === 'PUBLIC' });
  liveBroadcast('cinema:update', { action: 'update', id: item.id, visibility: item.visibility });
  return json({ item: cinemaPayload(item) });
});

export const DELETE = handle(async (_req, { params }: Ctx) => {
  await requireAdmin();
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return err('Invalid cinema item', 400);
  const existing = await prisma.cinemaVideo.findUnique({ where: { id } }).catch(() => null);
  await prisma.cinemaVideo.delete({ where: { id } }).catch(() => null);
  if (existing) {
    pushAdminEvent('cinema', `${existing.kind === 'MOVIE' ? 'Movie' : 'Series'} removed: ${existing.title}`);
    liveBroadcast('cinema:update', { action: 'remove', id });
  }
  return json({ ok: true });
});
