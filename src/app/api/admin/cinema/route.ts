import { handle, json, err, requireAdmin } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { cinemaPayload } from '@/lib/jam-cinema';

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

export const GET = handle(async () => {
  await requireAdmin();
  const rows = await prisma.cinemaVideo.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
  return json({ items: rows.map(cinemaPayload) });
});

export const POST = handle(async (req) => {
  await requireAdmin();
  const body = await req.json().catch(() => ({}));
  const title = typeof body.title === 'string' ? body.title.trim().slice(0, 180) : '';
  const kind = typeof body.kind === 'string' && body.kind.toUpperCase() === 'SERIES' ? 'SERIES' : 'MOVIE';
  const externalUrl = safeUrl(body.externalUrl);
  const thumbnailUrl = safeUrl(body.thumbnailUrl, 1200);
  const subtitlesUrl = safeUrl(body.subtitlesUrl, 1200);
  const durationSec = Number(body.durationSec ?? 0);
  if (!title) return err('Title is required');
  if (!externalUrl) return err('A direct video URL is required');
  if (!Number.isInteger(durationSec) || durationSec < 0 || durationSec > 86400) return err('Invalid duration');
  const item = await prisma.cinemaVideo.create({ data: { title, kind, description: typeof body.description === 'string' ? body.description.trim().slice(0, 3000) : '', externalUrl, thumbnailUrl, subtitlesUrl, durationSec } });
  return json({ item: cinemaPayload(item) }, 201);
});
