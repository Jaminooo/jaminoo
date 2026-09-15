import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { livePublish } from '@/lib/live-publish';

type Ctx = { params: { id: string } };

// POST /api/jams/[id]/join — join a public jam
export const POST = handle(async (_req, { params }: Ctx) => {
  const me = await requireUser();
  const jam = await prisma.jam.findUnique({ where: { id: params.id } });
  if (!jam) return err('Jam not found', 404);
  if (jam.type === 'PRIVATE') return err('This jam is private — you need an invite', 403);
  if (jam.closed) return err('This jam is closed', 403);
  await prisma.jamMember.upsert({
    where: { jamId_userId: { jamId: jam.id, userId: me.id } },
    update: {},
    create: { jamId: jam.id, userId: me.id },
  });
  livePublish([`jam:${jam.id}`, `user:${me.id}`], 'jam:update', jam.id);
  return json({ ok: true });
});