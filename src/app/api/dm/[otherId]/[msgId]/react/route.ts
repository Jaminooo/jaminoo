import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { REACTION_EMOJIS } from '@/lib/constants';
import { livePublish } from '@/lib/live-publish';
import { getOrCreateConvo, areFriends } from '@/lib/dm';

type Ctx = { params: { otherId: string; msgId: string } };

// POST /api/dm/[otherId]/[msgId]/react  { emoji } — toggle
export const POST = handle(async (req, { params }: Ctx) => {
  const me = await requireUser();
  const otherId = Number(params.otherId);
  if (!Number.isFinite(otherId) || otherId === me.id) return err('Invalid user');
  if (!(await areFriends(me.id, otherId))) return err('Not friends', 403);

  const { emoji } = (await req.json()) as { emoji?: string };
  if (!emoji || !REACTION_EMOJIS.includes(emoji)) return err('Invalid emoji');
  const msgId = Number(params.msgId);
  if (!Number.isFinite(msgId)) return err('Invalid message');

  const msg = await prisma.dmMessage.findUnique({ where: { id: msgId } });
  if (!msg) return err('Message not found', 404);
  const conv = await getOrCreateConvo(me.id, otherId);
  if (msg.convId !== conv.id) return err('Message not found', 404);

  const existing = await prisma.reaction.findFirst({
    where: { dmMsgId: msgId, userId: me.id, emoji },
  });

  if (existing) {
    await prisma.reaction.delete({ where: { id: existing.id } });
  } else {
    await prisma.reaction.create({ data: { dmMsgId: msgId, userId: me.id, emoji } });
  }

  const all = await prisma.reaction.findMany({ where: { dmMsgId: msgId } });
  const grouped = all.map((r) => ({ emoji: r.emoji, userId: r.userId }));
  livePublish([`user:${me.id}`, `user:${otherId}`], 'reaction:update', { messageId: msgId, reactions: grouped, userId: me.id, emoji });
  return json({ ok: true, toggled: !existing });
});
