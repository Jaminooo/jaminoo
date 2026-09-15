import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { livePublish } from '@/lib/live-publish';

type Ctx = { params: { id: string } };

// POST /api/jams/[id]/close { closed: true } — owner toggles jam closed (stops new members/invites)
export const POST = handle(async (req, { params }: Ctx) => {
  const me = await requireUser();
  const { closed } = (await req.json()) as { closed?: boolean };
  if (typeof closed !== 'boolean') return err('Provide closed: true/false');

  const jam = await prisma.jam.findUnique({ where: { id: params.id }, include: { members: true } });
  if (!jam) return err('Jam not found', 404);
  if (jam.ownerId !== me.id) return err('Only the owner can close this jam', 403);
  if (jam.closed === closed) return json({ ok: true, closed: jam.closed });

  await prisma.jam.update({ where: { id: jam.id }, data: { closed } });
  livePublish(`jam:${jam.id}`, 'jam:update', jam.id);
  return json({ ok: true, closed });
});