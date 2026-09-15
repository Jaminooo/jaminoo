import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { livePublish } from '@/lib/live-publish';

type Ctx = { params: { id: string } };

// POST /api/jams/[id]/leave — leave a jam (owner cannot leave; must close instead)
export const POST = handle(async (_req, { params }: Ctx) => {
  const me = await requireUser();
  const jam = await prisma.jam.findUnique({ where: { id: params.id }, include: { members: true } });
  if (!jam) return err('Jam not found', 404);
  const membership = jam.members.find((m) => m.userId === me.id);
  if (!membership) return err('You are not in this jam', 403);
  if (jam.ownerId === me.id) return err('Owner cannot leave — close the jam instead');

  await prisma.jamMember.delete({ where: { jamId_userId: { jamId: jam.id, userId: me.id } } });
  livePublish(`jam:${jam.id}`, 'jam:update', jam.id);
  return json({ ok: true });
});