import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { pubUser } from '@/lib/users';
import { randomBytes } from 'crypto';
import { groupSummary, GROUP_USER_SELECT } from '@/lib/groups';

// GET /api/groups — my groups + public groups to browse
export const GET = handle(async () => {
  const me = await requireUser();

  const memberships = await prisma.communityMember.findMany({
    where: { userId: me.id },
    include: {
      community: {
        include: {
          members: true,
          messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      },
    },
    orderBy: { joinedAt: 'desc' },
  });

  const browse = await prisma.community.findMany({
    where: { isPrivate: false },
    include: {
      members: true,
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      owner: { select: GROUP_USER_SELECT },
    },
    orderBy: { createdAt: 'desc' },
    take: 40,
  });

  const mineIds = new Set(memberships.map((m) => m.communityId));

  return json({
    mine: memberships.map((m) => groupSummary(m.community, m.role)),
    browse: browse.map((c) => ({
      ...groupSummary(c, mineIds.has(c.id) ? 'member' : null),
      owner: pubUser(c.owner),
    })),
  });
});

// POST /api/groups { name, desc?, avatarId?, isPrivate? }
export const POST = handle(async (req) => {
  const me = await requireUser();
  const { name, desc, avatarId, isPrivate } = (await req.json()) as {
    name?: string;
    desc?: string;
    avatarId?: number;
    isPrivate?: boolean;
  };
  if (!name || name.trim().length < 2 || name.trim().length > 40) return err('Group name must be 2–40 characters');
  if (name.trim().toLowerCase() === 'general') return err('That name is reserved');

  const ownedCount = await prisma.community.count({ where: { ownerId: me.id } });
  if (ownedCount >= 6) return err('You can own at most 6 groups', 403);

  const id = `G${Date.now().toString(36)}${randomBytes(4).toString('hex').toUpperCase()}`;

  const group = await prisma.community.create({
    data: {
      id,
      name: name.trim().slice(0, 40),
      desc: (desc ?? '').trim().slice(0, 160),
      avatarId: Number.isFinite(avatarId as number) && (avatarId as number) >= 0 ? (avatarId as number) : 0,
      isPrivate: Boolean(isPrivate),
      ownerId: me.id,
      members: { create: { userId: me.id, role: 'OWNER' } },
      channels: { create: { name: 'general', createdBy: me.id } },
    },
  });

  return json({ ok: true, group: { id: group.id, name: group.name, desc: group.desc, avatarId: group.avatarId, isPrivate: group.isPrivate } }, 201);
});