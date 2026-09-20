import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/rate-limit';
import { serializePoll } from '@/lib/tweet';

type Ctx = { params: { id: string } };

export const POST = handle(async (req, { params }: Ctx) => {
  const me = await requireUser();
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return err('Invalid poll', 400);
  rateLimit(`polls:vote:${me.id}`, 30, 60 * 1000);

  const poll = await prisma.poll.findUnique({
    where: { id },
    select: { id: true, expiresAt: true, tweet: { select: { id: true, visibility: true } } },
  });
  if (!poll || poll.tweet.visibility !== 'PUBLIC') return err('Poll not found', 404);

  if (poll.expiresAt && new Date(poll.expiresAt).getTime() < Date.now()) {
    return err('This poll has ended', 410);
  }

  const body = await req.json().catch(() => ({}));
  const optionId = Number(body.optionId);
  if (!Number.isInteger(optionId) || optionId <= 0) return err('Choose an option', 400);

  const option = await prisma.pollOption.findUnique({ where: { id: optionId }, select: { id: true, pollId: true, poll: { select: { tweetId: true } } } });
  if (!option || option.pollId !== poll.id) return err('Option not found', 404);

  const existing = await prisma.pollVote.findUnique({ where: { pollId_userId: { pollId: poll.id, userId: me.id } }, select: { id: true } });
  if (existing) return err('You already voted', 409);

  await prisma.pollVote.create({ data: { tweetId: option.poll.tweetId, pollId: poll.id, optionId, userId: me.id } });

  const updated = await prisma.poll.findUnique({
    where: { id: poll.id },
    include: {
      options: {
        include: {
          _count: { select: { votes: true } },
          votes: { where: { userId: me.id }, select: { id: true } },
        },
        orderBy: { id: 'asc' },
      },
    },
  });
  return json({ ok: true, poll: serializePoll(updated) });
});