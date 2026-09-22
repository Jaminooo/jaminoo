import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { jamMusicState } from '@/lib/jam-music';

type Ctx = { params: { id: string } };

export const GET = handle(async (_req, { params }: Ctx) => {
  const me = await requireUser({ allowGuest: true });
  const jam = await prisma.jam.findUnique({ where: { id: params.id }, select: { id: true, kind: true, members: true } });
  if (!jam) return err('Jam not found', 404);
  if (!jam.members.some((m) => m.userId === me.id)) return err('You are not in this jam', 403);
  if (jam.kind !== 'MUSIC') return err('This jam has no music player', 400);

  const data = await jamMusicState(params.id, me.id, me.isAdmin);
  if (!data) return err('Jam not found', 404);
  return json(data);
});