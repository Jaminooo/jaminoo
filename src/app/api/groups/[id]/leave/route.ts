import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { livePublish } from '@/lib/live-publish';

type Ctx = { params: { id: string } };

export const POST = handle(async (_req, { params }: Ctx) => {
  const me = await requireUser();
  const group = await prisma.community.findUnique({ where: { id: params.id }, include: { members: true } });
  if (!group) return err('Group not found', 404);
  const my = group.members.find((m) => m.userId === me.id);
  if (!my) return err('You are not a member', 403);
  if (my.role === 'OWNER') return err('The owner cannot leave their group', 403);

  await prisma.communityMember.delete({ where: { communityId_userId: { communityId: group.id, userId: me.id } } });

  const count = Math.max(0, group.members.length - 1);
  livePublish(`group:${group.id}`, 'group:update', { groupId: group.id, memberCount: count });
  return json({ ok: true, memberCount: count });
});