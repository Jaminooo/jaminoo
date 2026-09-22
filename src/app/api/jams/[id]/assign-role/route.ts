import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { livePublish } from '@/lib/live-publish';

type Ctx = { params: { id: string } };

// POST /api/jams/[id]/assign-role { userId, role: 'MINI_HOST' | 'MEMBER' } — the owner
// promotes/demotes a member to mini-host (DJ control rights).
export const POST = handle(async (req, { params }: Ctx) => {
  const me = await requireUser();
  const { userId, role } = (await req.json()) as { userId?: number; role?: string };
  if (!userId || !Number.isInteger(userId) || userId <= 0) return err('Bad request');
  if (role !== 'MINI_HOST' && role !== 'MEMBER') return err('Bad request');
  if (userId === me.id) return err('You cannot change your own role', 403);

  const jam = await prisma.jam.findUnique({
    where: { id: params.id },
    include: { members: true },
  });
  if (!jam) return err('Jam not found', 404);
  if (jam.ownerId !== me.id) return err('Only the owner can assign roles', 403);

  const target = jam.members.find((m) => m.userId === userId);
  if (!target) return err('That user is not in this jam', 404);
  if (target.role === 'HOST') return err('Cannot change the owner role', 403);
  if (target.role === role) return json({ ok: true });

  await prisma.jamMember.update({
    where: { jamId_userId: { jamId: jam.id, userId } },
    data: { role },
  });

  livePublish(`jam:${jam.id}`, 'jam:update', jam.id);
  return json({ ok: true });
});