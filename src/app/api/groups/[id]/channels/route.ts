import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { livePublish } from '@/lib/live-publish';

type Ctx = { params: { id: string } };

// POST /api/groups/[id]/channels { name, description? } — owner or admin
export const POST = handle(async (req, { params }: Ctx) => {
  const me = await requireUser();
  const { name, description } = (await req.json()) as { name?: string; description?: string };
  if (!name || name.trim().length < 1 || name.trim().length > 24) return err('Channel name must be 1–24 characters');
  const clean = name.trim().slice(0, 24);

  const group = await prisma.community.findUnique({
    where: { id: params.id },
    include: { members: true, channels: true },
  });
  if (!group) return err('Group not found', 404);
  const my = group.members.find((m) => m.userId === me.id);
  if (!my || (my.role !== 'OWNER' && my.role !== 'ADMIN')) return err('Only moderators can create channels', 403);
  if (group.channels.some((c) => c.name.toLowerCase() === clean.toLowerCase())) return err('A channel with that name already exists');

  const channel = await prisma.communityChannel.create({
    data: { communityId: group.id, name: clean, description: (description ?? '').trim().slice(0, 120), createdBy: me.id },
  });

  livePublish(`group:${group.id}`, 'group:update', { groupId: group.id });
  return json({ ok: true, channel: { id: channel.id, name: channel.name, description: channel.description } }, 201);
});