import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { livePublish } from '@/lib/live-publish';
import { rateLimitByUser } from '@/lib/rate-limit';

type Ctx = { params: { id: string; msgId: string } };

// POST /api/groups/[id]/messages/[msgId]/react { emoji } — toggle reaction
export const POST = handle(async (req, { params }: Ctx) => {
  const me = await requireUser();
  const { emoji } = (await req.json()) as { emoji?: string };
  if (!emoji || emoji.length > 8) return err('Invalid emoji');

  const group = await prisma.community.findUnique({ where: { id: params.id }, include: { members: true } });
  if (!group) return err('Group not found', 404);
  if (!group.members.some((m) => m.userId === me.id)) return err('You are not a member', 403);

  const msg = await prisma.communityMessage.findFirst({
    where: { id: params.msgId, communityId: group.id },
    include: { reactions: true },
  });
  if (!msg) return err('Message not found', 404);

  rateLimitByUser(req, me.id, 30, 10 * 1000);

  const existing = msg.reactions.find((r) => r.userId === me.id && r.emoji === emoji);
  if (existing) {
    await prisma.reaction.delete({ where: { id: existing.id } });
  } else {
    await prisma.reaction.create({ data: { groupMsgId: msg.id, emoji, userId: me.id } });
  }

  const reactions = await prisma.reaction.findMany({ where: { groupMsgId: msg.id } });
  const agg: Record<string, { count: number; me: boolean }> = {};
  for (const r of reactions) {
    agg[r.emoji] = agg[r.emoji] || { count: 0, me: false };
    agg[r.emoji].count++;
    if (r.userId === me.id) agg[r.emoji].me = true;
  }
  const list = Object.entries(agg).map(([e, v]) => ({ emoji: e, count: v.count, me: v.me }));

  livePublish(`group:${group.id}`, 'group:react', { groupId: group.id, msgId: msg.id, reactions: list });
  return json({ ok: true, msgId: msg.id, reactions: list });
});