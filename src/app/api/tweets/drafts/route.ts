import { handle, json, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/rate-limit';
import { normalizeFacets, parseFacets, stringifyFacets } from '@/lib/tweet-facets';

export const GET = handle(async (_req) => {
  const me = await requireUser();
  const draft = await prisma.draft.findUnique({ where: { userId: me.id } });
  return json({
    draft: draft ? {
      id: draft.id,
      text: draft.text,
      facets: parseFacets(draft.facets),
      mediaIds: safeJson(draft.mediaIds),
      quotedTweetId: draft.quotedTweetId,
      updatedAt: draft.updatedAt.toISOString(),
    } : null,
  });
});

export const POST = handle(async (req) => {
  const me = await requireUser();
  rateLimit(`drafts:${me.id}`, 60, 60 * 1000);

  const body = await req.json().catch(() => ({}));
  const text = typeof body.text === 'string' ? body.text.slice(0, 560) : '';
  const mediaIds = JSON.stringify(Array.isArray(body.mediaIds) ? body.mediaIds.map(String) : []);
  const facets = stringifyFacets(normalizeFacets(body.facets, text.length));
  const quotedTweetId = Number.isInteger(body.quotedTweetId) ? body.quotedTweetId : undefined;

  const draft = await prisma.draft.upsert({
    where: { userId: me.id },
    update: { text, mediaIds, facets, ...(body.quotedTweetId === null ? { quotedTweetId: null } : quotedTweetId ? { quotedTweetId } : {}) },
    create: { userId: me.id, text, mediaIds, facets, quotedTweetId: quotedTweetId ?? null },
  });
  return json({ draft: { id: draft.id, text: draft.text, facets: parseFacets(draft.facets), mediaIds: safeJson(draft.mediaIds), quotedTweetId: draft.quotedTweetId, updatedAt: draft.updatedAt.toISOString() } });
});

export const DELETE = handle(async (_req) => {
  const me = await requireUser();
  await prisma.draft.deleteMany({ where: { userId: me.id } });
  return json({ ok: true });
});

function safeJson(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}