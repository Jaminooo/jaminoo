import { handle, json, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { BadRequestError } from '@/lib/api';
import { rateLimit } from '@/lib/rate-limit';

function safeJson(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export const GET = handle(async () => {
  const me = await requireUser();
  const rows = await prisma.scheduledTweet.findMany({
    where: { userId: me.id },
    orderBy: { publishAt: 'desc' },
    take: 50,
  });
  return json({
    scheduled: rows.map((row) => ({
      id: row.id,
      text: row.text,
      mediaIds: safeJson(row.mediaIds),
      replyToId: row.replyToId,
      publishAt: row.publishAt.toISOString(),
      status: row.status,
      publishedAt: row.publishedAt?.toISOString() ?? null,
    })),
  });
});

export const POST = handle(async (req) => {
  const me = await requireUser();
  rateLimit(`tweets:schedule:${me.id}`, 10, 60 * 60 * 1000);

  const body = await req.json().catch(() => ({}));
  const text = typeof body.text === 'string' ? body.text.trim() : '';
  const mediaIds = JSON.stringify(Array.isArray(body.mediaIds) ? body.mediaIds.map(String) : []);
  const replyToId = Number.isInteger(body.replyToId) ? body.replyToId : null;
  const publishAt = new Date(typeof body.publishAt === 'string' ? body.publishAt : Number(body.publishAt ?? 0));

  if (Number.isNaN(publishAt.getTime())) throw new BadRequestError('A valid publish time is required');
  if (publishAt.getTime() <= Date.now()) throw new BadRequestError('Publish time must be in the future');
  if (!text && mediaIds === '[]' && !replyToId) throw new BadRequestError('Say something first');
  if (text.length > 560) throw new BadRequestError('Tweet is too long');

  const row = await prisma.scheduledTweet.create({
    data: { userId: me.id, text, mediaIds, replyToId, publishAt },
  });
  return json({
    scheduled: {
      id: row.id,
      text: row.text,
      mediaIds: safeJson(row.mediaIds),
      replyToId: row.replyToId,
      publishAt: row.publishAt.toISOString(),
      status: row.status,
      publishedAt: null,
    },
  }, 201);
});