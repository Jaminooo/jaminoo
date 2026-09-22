import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { livePublish } from '@/lib/live-publish';
import { JAM_MAX_MEMBERS } from '@/lib/constants';

type Ctx = { params: { id: string } };

// POST /api/jams/[id]/join — join an open, public jam
export const POST = handle(async (_req, { params }: Ctx) => {
  const me = await requireUser({ allowGuest: true });
  const jam = await prisma.jam.findUnique({ where: { id: params.id }, include: { members: true } });
  if (!jam) return err('Jam not found', 404);
  if (jam.type === 'PRIVATE') return err('This jam is private — you need an invite', 403);
  if (jam.closed) return err('This jam is closed', 403);

  const memberCount = await prisma.jamMember.count({ where: { jamId: jam.id } });
  if (memberCount >= JAM_MAX_MEMBERS && !jam.members.some((m) => m.userId === me.id)) {
    return err('This jam is full', 403);
  }

  await prisma.jamMember.upsert({
    where: { jamId_userId: { jamId: jam.id, userId: me.id } },
    update: {},
    create: { jamId: jam.id, userId: me.id },
  });
  livePublish([`jam:${jam.id}`, `user:${me.id}`], 'jam:update', jam.id);
  return json({ ok: true });
});