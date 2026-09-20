import { handle, json, err, requireAdmin } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { pushAdminEvent } from '@/lib/admin';
import { livePublish } from '@/lib/live-publish';

type Ctx = { params: { id: string } };

const HIDDEN_VISIBILITY = 'HIDDEN';

export const POST = handle(async (req, { params }: Ctx) => {
  const admin = await requireAdmin();
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return err('Invalid tweet', 400);

  const body = await req.json().catch(() => ({}));
  const action = typeof body.action === 'string' ? body.action.toUpperCase() : '';
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 300) : '';
  if (!['HIDE', 'UNHIDE', 'DELETE'].includes(action)) return err('Unknown moderation action');

  const tweet = await prisma.tweet.findUnique({
    where: { id },
    select: { id: true, text: true, author: { select: { id: true, username: true } }, visibility: true },
  });
  if (!tweet) return err('Tweet not found', 404);

  if (action === 'DELETE') {
    if (tweet.author.id === admin.id) return err('Admins cannot hard-delete their own tweets here');
    await prisma.tweetMod.create({ data: { tweetId: tweet.id, adminId: admin.id, action: 'DELETED', note } });
    await prisma.tweet.delete({ where: { id } });
    livePublish(['tweet:public', `user:${tweet.author.id}`], 'tweet:delete', { tweetId: id, authorId: tweet.author.id });
    pushAdminEvent('action', `Admin deleted tweet #${id} by @${tweet.author.username}`, { tweetId: id, admin: admin.username });
    return json({ status: 'DELETED', tweetId: id });
  }

  const nextVisibility = action === 'HIDE' ? HIDDEN_VISIBILITY : 'PUBLIC';
  const modAction = action === 'HIDE' ? 'HIDDEN' : 'UNHIDDEN';
  await prisma.tweetMod.create({ data: { tweetId: tweet.id, adminId: admin.id, action: modAction, note } });
  await prisma.tweet.update({ where: { id }, data: { visibility: nextVisibility } });

  if (action === 'HIDE') {
    await prisma.messageReport.updateMany({ where: { tweetId: id, status: 'OPEN' }, data: { status: 'RESOLVED' } });
    livePublish(['tweet:public', `user:${tweet.author.id}`], 'tweet:delete', { tweetId: id, authorId: tweet.author.id });
  } else {
    livePublish(['tweet:public', `user:${tweet.author.id}`], 'tweet:mod-unhide', { tweetId: id, authorId: tweet.author.id });
  }
  pushAdminEvent('action', `Admin ${action === 'HIDE' ? 'hid' : 'restored'} tweet #${id} by @${tweet.author.username}`, { tweetId: id, admin: admin.username, note });
  return json({ status: nextVisibility, tweetId: id });
});

export const GET = handle(async (req) => {
  await requireAdmin();
  const url = new URL(req.url);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? 50)));
  const rows = await prisma.tweetMod.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      admin: { select: { id: true, username: true } },
      tweet: { select: { id: true, author: { select: { username: true } } } },
    },
  });
  return json({
    rows: rows.map((row) => ({
      id: row.id,
      action: row.action,
      note: row.note,
      tweetId: row.tweetId,
      author: row.tweet?.author?.username ?? null,
      admin: row.admin.username,
      createdAt: row.createdAt.toISOString(),
    })),
  });
});