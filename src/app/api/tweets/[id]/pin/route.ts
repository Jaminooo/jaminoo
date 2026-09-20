import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';

type Ctx = { params: { id: string } };

export const POST = handle(async (req, { params }: Ctx) => {
  const me = await requireUser();
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return err('Invalid tweet', 400);

  const tweet = await prisma.tweet.findUnique({
    where: { id },
    select: { id: true, authorId: true, retweetOfId: true, visibility: true },
  });
  if (!tweet) return err('Tweet not found', 404);
  if (tweet.authorId !== me.id) return err('You can only pin your own tweets', 403);
  if (tweet.retweetOfId) return err('Reposts cannot be pinned');

  const body = await req.json().catch(() => ({}));
  const pinned = body.pinned === true;

  if (pinned) {
    await prisma.user.update({ where: { id: me.id }, data: { pinnedTweetId: id } });
  } else {
    // Only clear the pin if it actually points at this tweet.
    await prisma.user.updateMany({ where: { id: me.id, pinnedTweetId: id }, data: { pinnedTweetId: null } });
  }
  return json({ ok: true, pinned });
});