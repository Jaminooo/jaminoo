import { handle, json, err } from '@/lib/api';
import { requireHubAdmin } from '@/lib/roles';
const ADMIN_SCOPE = 'CINEMA';
import { prisma } from '@/lib/prisma';
import { cinemaPayload } from '@/lib/jam-cinema';
import { pushAdminEvent } from '@/lib/admin';
import { liveBroadcast } from '@/lib/live-publish';
import { parseQualitySources } from '@/lib/watch-select';

function safeUrl(value: unknown, max = 1800) {
  if (typeof value !== 'string' || !value.trim()) return '';
  const candidate = value.trim().slice(0, max);
  if (/^\/api\/media\/[A-Za-z0-9_-]+$/.test(candidate) || candidate === '/defaults/videos/demo.mp4') return candidate;
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? candidate : '';
  } catch {
    return '';
  }
}

const CINEMA_KIND_LABEL: Record<string, string> = { MOVIE: 'Movie', SERIES: 'Series', CARTOON: 'Cartoon' };

export const GET = handle(async () => {
  await requireHubAdmin(ADMIN_SCOPE);
  const rows = await prisma.cinemaVideo.findMany({ orderBy: { createdAt: 'desc' }, take: 200, include: { _count: { select: { episodes: true } } } });
  return json({ items: rows.map((row) => ({ ...cinemaPayload(row), episodeCount: row._count.episodes })) });
});

export const POST = handle(async (req) => {
  await requireHubAdmin(ADMIN_SCOPE);
  const body = await req.json().catch(() => ({}));
  const title = typeof body.title === 'string' ? body.title.trim().slice(0, 180) : '';
  const rawKind = typeof body.kind === 'string' ? body.kind.toUpperCase() : '';
  const kind = rawKind === 'SERIES' || rawKind === 'CARTOON' ? rawKind : 'MOVIE';
  const externalUrl = safeUrl(body.externalUrl);
  const thumbnailUrl = safeUrl(body.thumbnailUrl, 1200);
  const subtitlesUrl = safeUrl(body.subtitlesUrl, 1200);
  const durationSec = Number(body.durationSec ?? 0);
  if (!title) return err('Title is required');
  if (!Number.isInteger(durationSec) || durationSec < 0 || durationSec > 86400) return err('Invalid duration');
  const item = await prisma.cinemaVideo.create({
    data: {
      title,
      kind,
      description: typeof body.description === 'string' ? body.description.trim().slice(0, 3000) : '',
      externalUrl,
      qualitySources: JSON.stringify(parseQualitySources(body.qualitySources)),
      thumbnailUrl,
      subtitlesUrl,
      durationSec,
      visibility: body.visibility === 'HIDDEN' ? 'HIDDEN' : 'PUBLIC',
    },
  });
  pushAdminEvent('cinema', `${CINEMA_KIND_LABEL[kind] ?? 'Movie'} published: ${title}`);
  liveBroadcast('cinema:update', { action: 'create', id: item.id });
  return json({ item: cinemaPayload(item) }, 201);
});
