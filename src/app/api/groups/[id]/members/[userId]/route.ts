import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { livePublish } from '@/lib/live-publish';
import { GROUP_ROLES } from '@/lib/groups';

type Ctx = { params: { id: string; userId: string } };

// PATCH /api/groups/[id]/members/[userId] { role: 'ADMIN'|'MEMBER' } — owner or admin
export const PATCH = handle(async (req, { params }: Ctx) => {
  const me = await requireUser();
  const { role } = (await req.json()) as { role?: string };
  const targetId = Number(params.userId);
  if (!Number.isInteger(targetId)) return err('Invalid member', 400);
  if (role !== 'ADMIN' && role !== 'MEMBER') return err('Invalid role');
  if (targetId === me.id) return err('You cannot change your own role');

  const group = await prisma.community.findUnique({ where: { id: params.id }, include: { members: true } });
  if (!group) return err('Group not found', 404);
  const my = group.members.find((m) => m.userId === me.id);
  if (!my || (my.role !== 'OWNER' && my.role !== 'ADMIN')) return err('Only moderators can manage members', 403);
  const target = group.members.find((m) => m.userId === targetId);
  if (!target) return err('Member not found', 404);
  if (target.role === 'OWNER') return err('Cannot change the owner', 403);
  if (my.role === 'ADMIN' && (target.role === 'ADMIN' || role === 'ADMIN')) return err('Only the owner can manage admins', 403);

  const updated = await prisma.communityMember.update({
    where: { communityId_userId: { communityId: group.id, userId: targetId } },
    data: { role: role as (typeof GROUP_ROLES)[number] },
  });

  livePublish(`group:${group.id}`, 'group:update', { groupId: group.id });
  return json({ ok: true, role: updated.role });
});

// DELETE /api/groups/[id]/members/[userId] — owner or admin
export const DELETE = handle(async (_req, { params }: Ctx) => {
  const me = await requireUser();
  const targetId = Number(params.userId);
  if (!Number.isInteger(targetId)) return err('Invalid member', 400);

  const group = await prisma.community.findUnique({ where: { id: params.id }, include: { members: true } });
  if (!group) return err('Group not found', 404);
  const my = group.members.find((m) => m.userId === me.id);
  if (!my || (my.role !== 'OWNER' && my.role !== 'ADMIN')) return err('Only moderators can manage members', 403);
  const target = group.members.find((m) => m.userId === targetId);
  if (!target) return err('Member not found', 404);
  if (target.role === 'OWNER') return err('Cannot remove the owner', 403);
  if (my.role === 'ADMIN' && (target.role === 'ADMIN' || target.role === 'OWNER')) return err('Only the owner can manage admins', 403);

  await prisma.communityMember.delete({
    where: { communityId_userId: { communityId: group.id, userId: targetId } },
  });

  livePublish(`group:${group.id}`, 'group:update', { groupId: group.id });
  return json({ ok: true });
});