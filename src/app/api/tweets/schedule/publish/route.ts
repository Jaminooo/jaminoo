import { handle, json } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { createTweetRecord } from '@/lib/tweet-create';

// Server worker: publishes scheduled tweets whose publishAt has arrived.
// Trigger externally via an HTTP cron (e.g. every minute) or manually from the
// Scheduled view. When CRON_SECRET is set the caller must send it in the
// `x-cron-secret` header; otherwise any authenticated user may trigger a run.
export const POST = handle(async (req) => {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get('x-cron-secret');
  if (secret && header !== secret) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const due = await prisma.scheduledTweet.findMany({
    where: { status: 'PENDING', publishAt: { lte: new Date() } },
    orderBy: { publishAt: 'asc' },
    take: 50,
    include: { user: { select: { id: true, username: true } } },
  });

  const results = { published: 0, failed: 0 };
  for (const row of due) {
    let mediaIds: string[] = [];
    try {
      const parsed = JSON.parse(row.mediaIds);
      if (Array.isArray(parsed)) mediaIds = parsed.map(String);
    } catch {
      mediaIds = [];
    }
    try {
      await createTweetRecord(
        { text: row.text, facets: row.facets, mediaIds, replyToId: row.replyToId ?? undefined },
        { authorId: row.userId, myUsername: row.user.username }
      );
      await prisma.scheduledTweet.update({
        where: { id: row.id },
        data: { status: 'PUBLISHED', publishedAt: new Date() },
      });
      results.published += 1;
    } catch {
      await prisma.scheduledTweet.update({ where: { id: row.id }, data: { status: 'FAILED' } });
      results.failed += 1;
    }
  }
  return json(results);
});