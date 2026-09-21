import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';

type Ctx = { params: { id: string } };

// POST /api/groups/[id]/read — mark all current messages read for me
export const POST = handle(async (_req, { params }: Ctx) => {
  const me = await requireUser();
  const group = await prisma.community.findUnique({ where: { id: params.id }, include: { members: true } });
  if (!group) return err('Group not found', 404);
  const my = group.members.find((m) => m.userId === me.id);
  if (!my) return err('You are not a member', 403);

  await prisma.communityMember.update({
    where: { communityId_userId: { communityId: group.id, userId: me.id } },
    data: { lastReadAt: new Date() },
  });

  return json({ ok: true });
});