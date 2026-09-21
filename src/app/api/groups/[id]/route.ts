import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { pubUser } from '@/lib/users';
import { GROUP_USER_SELECT } from '@/lib/groups';
import { livePublish } from '@/lib/live-publish';

type Ctx = { params: { id: string } };

// GET /api/groups/[id] — detail with channels, members, my role
export const GET = handle(async (_req, { params }: Ctx) => {
  const me = await requireUser();
  const group = await prisma.community.findUnique({
    where: { id: params.id },
    include: {
      owner: { select: GROUP_USER_SELECT },
      channels: { orderBy: { createdAt: 'asc' } },
      members: { include: { user: { select: GROUP_USER_SELECT } }, orderBy: { joinedAt: 'asc' }, take: 80 },
    },
  });
  if (!group) return err('Group not found', 404);

  const my = group.members.find((m) => m.userId === me.id);
  if (!my && group.isPrivate) return err('This group is private', 403);

  return json({
    group: {
      id: group.id,
      name: group.name,
      desc: group.desc,
      avatarId: group.avatarId,
      isPrivate: group.isPrivate,
      ownerId: group.ownerId,
      createdAt: group.createdAt.toISOString(),
      owner: pubUser(group.owner),
    },
    myRole: my?.role ?? null,
    channels: group.channels.map((c) => ({ id: c.id, name: c.name, description: c.description })),
    members: group.members.map((m) => ({ role: m.role, joinedAt: m.joinedAt.toISOString(), user: pubUser(m.user) })),
  });
});

// PATCH /api/groups/[id] { name?, desc?, avatarId?, isPrivate? } — owner only
export const PATCH = handle(async (req, { params }: Ctx) => {
  const me = await requireUser();
  const { name, desc, avatarId, isPrivate } = (await req.json()) as {
    name?: string;
    desc?: string;
    avatarId?: number;
    isPrivate?: boolean;
  };

  const group = await prisma.community.findUnique({ where: { id: params.id }, include: { members: true } });
  if (!group) return err('Group not found', 404);
  const my = group.members.find((m) => m.userId === me.id);
  if (!my || my.role !== 'OWNER') return err('Only the owner can edit this group', 403);

  if (name != null && (name.trim().length < 2 || name.trim().length > 40)) return err('Group name must be 2–40 characters');
  if (name != null && name.trim().toLowerCase() === 'general') return err('That name is reserved');

  const updated = await prisma.community.update({
    where: { id: group.id },
    data: {
      ...(name != null ? { name: name.trim().slice(0, 40) } : {}),
      ...(desc != null ? { desc: desc.trim().slice(0, 160) } : {}),
      ...(avatarId != null && Number.isFinite(avatarId) ? { avatarId: Math.max(0, Math.min(11, avatarId)) } : {}),
      ...(isPrivate != null ? { isPrivate } : {}),
    },
  });

  livePublish(`group:${group.id}`, 'group:update', { groupId: group.id });
  return json({ ok: true, group: { id: updated.id, name: updated.name, desc: updated.desc, avatarId: updated.avatarId, isPrivate: updated.isPrivate } });
});

// DELETE /api/groups/[id] — owner only
export const DELETE = handle(async (_req, { params }: Ctx) => {
  const me = await requireUser();
  const group = await prisma.community.findUnique({ where: { id: params.id }, include: { members: true } });
  if (!group) return err('Group not found', 404);
  const my = group.members.find((m) => m.userId === me.id);
  if (!my || my.role !== 'OWNER') return err('Only the owner can delete this group', 403);

  await prisma.community.delete({ where: { id: group.id } });
  livePublish(`group:${group.id}`, 'group:deleted', { groupId: group.id });
  return json({ ok: true });
});