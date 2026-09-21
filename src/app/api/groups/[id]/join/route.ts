import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { livePublish } from '@/lib/live-publish';

type Ctx = { params: { id: string } };

export const POST = handle(async (_req, { params }: Ctx) => {
  const me = await requireUser();
  const group = await prisma.community.findUnique({ where: { id: params.id }, include: { members: true } });
  if (!group) return err('Group not found', 404);
  if (group.isPrivate) return err('This group is private', 403);
  if (group.members.some((m) => m.userId === me.id)) return err('Already a member');

  await prisma.communityMember.create({
    data: { communityId: group.id, userId: me.id, role: 'MEMBER' },
  });

  const count = group.members.length + 1;
  livePublish(`group:${group.id}`, 'group:update', { groupId: group.id, memberCount: count });
  return json({ ok: true, memberCount: count }, 201);
});