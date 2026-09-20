import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { serializeTweet } from '@/lib/tweet';
import { tweetIncludes, hiddenAuthorIds } from '@/lib/tweet-db';

type TweetRow = NonNullable<Awaited<ReturnType<typeof prisma.tweet.findUnique>>>;

// Full ancestry of a tweet: root -> ... -> parent -> tweet.
export const GET = handle(async (req) => {
  const me = await requireUser();
  const id = Number(new URL(req.url).searchParams.get('id') ?? 0);
  if (!Number.isInteger(id) || id <= 0) return err('Invalid tweet', 400);

  const hidden = await hiddenAuthorIds(me.id);
  const first = await prisma.tweet.findUnique({
    where: { id },
    include: tweetIncludes(me.id),
  });
  if (!first || first.visibility !== 'PUBLIC') return err('Tweet not found', 404);
  if (hidden.includes(first.authorId)) return err('Tweet not found', 404);

  const chain: TweetRow[] = [first];
  let cursorPid: number | null = first.replyToId;
  const guard = new Set<number>();
  while (cursorPid && chain.length < 50) {
    if (guard.has(cursorPid)) break;
    guard.add(cursorPid);
    const parent = await prisma.tweet.findUnique({
      where: { id: cursorPid },
      include: tweetIncludes(me.id),
    });
    if (!parent || parent.visibility !== 'PUBLIC') break;
    if (hidden.includes(parent.authorId)) break;
    chain.unshift(parent);
    cursorPid = parent.replyToId;
  }

  const ids = chain.map((t) => t.id);
  const myRetweets = ids.length > 0
    ? await prisma.tweet.findMany({ where: { retweetOfId: { in: ids }, authorId: me.id }, select: { retweetOfId: true } })
    : [];
  const retweetedSet = new Set(myRetweets.map((r) => r.retweetOfId));
  return json({ thread: chain.map((t) => serializeTweet(t, retweetedSet.has(t.id))) });
});