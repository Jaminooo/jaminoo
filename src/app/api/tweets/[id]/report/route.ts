import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { TWEET_REPORT_REASONS, isTweetReportReason, TWEET_REASON_LABELS } from '@/lib/report-reasons';
import { rateLimit } from '@/lib/rate-limit';

type Ctx = { params: { id: string } };

export const POST = handle(async (req, { params }: Ctx) => {
  const me = await requireUser();
  rateLimit(`tweets:report:${me.id}`, 20, 60 * 60 * 1000);
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return err('Invalid tweet', 400);

  const tweet = await prisma.tweet.findUnique({ where: { id }, select: { id: true, visibility: true } });
  if (!tweet || tweet.visibility !== 'PUBLIC') return err('Tweet not found', 404);

  const body = await req.json().catch(() => ({}));
  const category = typeof body.reason === 'string' ? body.reason.toUpperCase() : '';
  const details = typeof body.details === 'string' ? body.details.trim().slice(0, 300) : '';
  if (!isTweetReportReason(category)) return err('Choose a report reason');

  const existing = await prisma.messageReport.findFirst({
    where: { reporterId: me.id, tweetId: id, status: 'OPEN' },
    select: { id: true },
  });
  if (existing) return err('You already reported this tweet', 409);

  await prisma.messageReport.create({
    data: {
      reporterId: me.id,
      tweetId: id,
      reasonCategory: category,
      reason: details || TWEET_REASON_LABELS[category],
    },
  });
  return json({ ok: true }, 201);
});