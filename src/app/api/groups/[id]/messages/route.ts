import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { livePublish } from '@/lib/live-publish';
import { guardTextMessage } from '@/lib/chat-moderation';
import { groupMsgPayload, GROUP_USER_SELECT } from '@/lib/groups';

type Ctx = { params: { id: string } };

// GET /api/groups/[id]/messages?channelId=...&afterId=... — poll messages newer than `afterId`
export const GET = handle(async (req, { params }: Ctx) => {
  const me = await requireUser();
  const url = new URL(req.url);
  const channelId = url.searchParams.get('channelId');
  const afterId = url.searchParams.get('afterId');

  const group = await prisma.community.findUnique({ where: { id: params.id }, include: { members: true } });
  if (!group) return err('Group not found', 404);
  if (!group.members.some((m) => m.userId === me.id)) return err('You are not a member', 403);
  if (!channelId) return err('channelId required', 400);

  const channel = await prisma.communityChannel.findFirst({ where: { id: channelId, communityId: group.id } });
  if (!channel) return err('Channel not found', 404);

  let where: any = { channelId, communityId: group.id };
  if (afterId) {
    const after = await prisma.communityMessage.findUnique({ where: { id: afterId } });
    if (after && after.channelId === channelId) where.createdAt = { gte: after.createdAt };
  }

  const messages = await prisma.communityMessage.findMany({
    where,
    include: {
      user: { select: GROUP_USER_SELECT },
      media: true,
      reactions: true,
    },
    orderBy: { createdAt: 'asc' },
    take: 200,
  });

  return json({ channel: { id: channel.id, name: channel.name }, messages: messages.map((m) => groupMsgPayload(m, me.id)) });
});

// POST /api/groups/[id]/messages { channelId, text }
export const POST = handle(async (req, { params }: Ctx) => {
  const me = await requireUser();
  const { channelId, text } = (await req.json()) as { channelId?: string; text?: string };
  if (!channelId) return err('channelId required', 400);
  if (!text || !text.trim()) return err('Empty message');
  const textClean = text.trim().slice(0, 1000);

  const group = await prisma.community.findUnique({ where: { id: params.id }, include: { members: true } });
  if (!group) return err('Group not found', 404);
  if (!group.members.some((m) => m.userId === me.id)) return err('You are not a member', 403);

  const channel = await prisma.communityChannel.findFirst({ where: { id: channelId, communityId: group.id } });
  if (!channel) return err('Channel not found', 404);

  guardTextMessage(req, me.id, textClean);

  const msg = await prisma.communityMessage.create({
    data: { communityId: group.id, channelId, userId: me.id, kind: 'TEXT', text: textClean },
    include: { user: { select: GROUP_USER_SELECT }, media: true, reactions: true },
  });

  const payload = groupMsgPayload(msg, me.id);
  livePublish(`group:${group.id}`, 'group:message', { groupId: group.id, ...payload });
  return json({ ok: true, msg: payload }, 201);
});