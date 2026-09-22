import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { livePublish } from '@/lib/live-publish';

type Ctx = { params: { id: string } };

// POST /api/jams/[id]/leave — leave a jam. The DJ may leave; admin transfers
// automatically to the highest-ranked online member.
export const POST = handle(async (_req, { params }: Ctx) => {
  const me = await requireUser({ allowGuest: true });
  const jam = await prisma.jam.findUnique({
    where: { id: params.id },
    include: { members: { include: { user: { select: { isGuest: true } } } } },
  });
  if (!jam) return err('Jam not found', 404);
  const membership = jam.members.find((m) => m.userId === me.id);
  if (!membership) return err('You are not in this jam', 403);

  await prisma.jamMember.delete({ where: { jamId_userId: { jamId: jam.id, userId: me.id } } });

  if (jam.ownerId === me.id) {
    const successor = jam.members
      .filter((m) => m.userId !== me.id && !m.user.isGuest)
      .sort((a, b) => {
        if (a.role === 'MINI_HOST' && b.role !== 'MINI_HOST') return -1;
        if (b.role === 'MINI_HOST' && a.role !== 'MINI_HOST') return 1;
        return a.joinedAt.getTime() - b.joinedAt.getTime();
      })[0];
    if (successor) {
      await prisma.jam.update({ where: { id: jam.id }, data: { ownerId: successor.userId } });
      await prisma.jamMember.update({
        where: { jamId_userId: { jamId: jam.id, userId: successor.userId } },
        data: { role: 'HOST' },
      });
    } else {
      await prisma.jam.update({ where: { id: jam.id }, data: { ownerId: me.id, closed: true } });
    }
  }

  if (me.isGuest) {
    await prisma.jamMember.deleteMany({ where: { userId: me.id } }).catch(() => {});
    const remaining = await prisma.jamMember.count({ where: { userId: me.id } });
    if (remaining === 0) {
      await prisma.session.deleteMany({ where: { userId: me.id } });
      await prisma.user.delete({ where: { id: me.id } }).catch(() => {});
    }
  }

  livePublish(`jam:${jam.id}`, 'jam:update', jam.id);
  return json({ ok: true });
});