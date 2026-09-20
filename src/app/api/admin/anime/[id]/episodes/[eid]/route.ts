import { handle, json, err } from '@/lib/api';
import { requireHubAdmin } from '@/lib/roles';
import { prisma } from '@/lib/prisma';
import { animeEpisodePayload } from '@/lib/anime';
import { pushAdminEvent } from '@/lib/admin';
import { liveBroadcast } from '@/lib/live-publish';

const ADMIN_SCOPE = 'ANIME';
type Ctx = { params: { id: string; eid: string } };

function clampInt(v: unknown, min: number, max: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(min, Math.min(max, Math.round(n)));
}

export const GET = handle(async (_req, { params }: Ctx) => {
  await requireHubAdmin(ADMIN_SCOPE);
  const id = Number(params.id);
  const eid = Number(params.eid);
  if (!Number.isInteger(id) || id <= 0) return err('Invalid anime', 400);
  if (!Number.isInteger(eid) || eid <= 0) return err('Invalid episode', 400);
  const episode = await prisma.animeEpisode.findFirst({ where: { id: eid, animeId: id } });
  if (!episode) return err('Episode not found', 404);
  return json({ episode: animeEpisodePayload(episode) });
});

export const PATCH = handle(async (req, { params }: Ctx) => {
  await requireHubAdmin(ADMIN_SCOPE);
  const id = Number(params.id);
  const eid = Number(params.eid);
  if (!Number.isInteger(id) || id <= 0) return err('Invalid anime', 400);
  if (!Number.isInteger(eid) || eid <= 0) return err('Invalid episode', 400);
  const existing = await prisma.animeEpisode.findUnique({ where: { id: eid, animeId: id } });
  if (!existing) return err('Episode not found', 404);
  const body = await req.json().catch(() => ({}));
  const data: any = {};
  if (body.number !== undefined) {
    const n = clampInt(body.number, 0, 9999);
    if (n) data.number = n;
  }
  if (typeof body.title === 'string') data.title = body.title.trim().slice(0, 180);
  if (typeof body.slug === 'string') data.slug = body.slug.trim().slice(0, 80);
  if (typeof body.externalUrl === 'string') data.externalUrl = body.externalUrl.trim().slice(0, 1800);
  if (typeof body.thumbnailUrl === 'string') data.thumbnailUrl = body.thumbnailUrl.trim().slice(0, 1200);
  if (typeof body.subtitlesUrl === 'string') data.subtitlesUrl = body.subtitlesUrl.trim().slice(0, 1200);
  if (body.durationSec !== undefined) data.durationSec = clampInt(body.durationSec, 0, 86400);
  const item = await prisma.animeEpisode.update({ where: { id: eid }, data });
  liveBroadcast('anime:update', { action: 'episode-update', animeId: id, episodeId: item.id });
  return json({ episode: animeEpisodePayload(item) });
});

export const DELETE = handle(async (_req, { params }: Ctx) => {
  await requireHubAdmin(ADMIN_SCOPE);
  const id = Number(params.id);
  const eid = Number(params.eid);
  if (!Number.isInteger(id) || id <= 0) return err('Invalid anime', 400);
  if (!Number.isInteger(eid) || eid <= 0) return err('Invalid episode', 400);
  const existing = await prisma.animeEpisode.findUnique({ where: { id: eid, animeId: id } });
  if (!existing) return err('Episode not found', 404);
  await prisma.animeEpisode.delete({ where: { id: eid } });
  pushAdminEvent('anime', `Episode #${existing.number} removed: ${existing.title}`);
  liveBroadcast('anime:update', { action: 'episode-remove', animeId: id, episodeId: eid });
  return json({ ok: true });
});
