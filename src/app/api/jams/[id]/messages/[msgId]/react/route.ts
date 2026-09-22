import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { REACTION_EMOJIS } from '@/lib/constants';
import { livePublish } from '@/lib/live-publish';

type Ctx = { params: { id: string; msgId: string } };

// POST /api/jams/[id]/messages/[msgId]/react  { emoji } — toggle
export const POST = handle(async (req, { params }: Ctx) => {
  const me = await requireUser({ allowGuest: true });
  const { emoji } = (await req.json()) as { emoji?: string };
  if (!emoji || !REACTION_EMOJIS.includes(emoji)) return err('Invalid emoji');
  const msgId = Number(params.msgId);
  if (!Number.isFinite(msgId)) return err('Invalid message');

  const jam = await prisma.jam.findUnique({ where: { id: params.id }, include: { members: true } });
  if (!jam) return err('Jam not found', 404);
  if (!jam.members.some((m) => m.userId === me.id)) return err('You are not in this jam', 403);

  const msg = await prisma.jamMessage.findUnique({ where: { id: msgId } });
  if (!msg || msg.jamId !== params.id) return err('Message not found', 404);

  const existing = await prisma.reaction.findFirst({
    where: { jamMsgId: msgId, userId: me.id, emoji },
  });

  if (existing) {
    await prisma.reaction.delete({ where: { id: existing.id } });
  } else {
    await prisma.reaction.create({ data: { jamMsgId: msgId, userId: me.id, emoji } });
  }

  const all = await prisma.reaction.findMany({ where: { jamMsgId: msgId } });
  const grouped = all.map((r) => ({ emoji: r.emoji, userId: r.userId }));
  livePublish(`jam:${params.id}`, 'reaction:update', { messageId: msgId, reactions: grouped, userId: me.id, emoji });
  return json({ ok: true, toggled: !existing });
});
