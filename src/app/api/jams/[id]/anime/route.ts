import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { jamAnimeState, setJamAnimeState } from '@/lib/anime-sync';

type Ctx = { params: { id: string } };

export const GET = handle(async (_req, { params }: Ctx) => {
  const me = await requireUser();
  const jam = await prisma.jam.findUnique({ where: { id: params.id }, select: { id: true, kind: true, members: true } });
  if (!jam) return err('Jam not found', 404);
  if (jam.kind !== 'ANIME') return err('This jam has no anime player', 400);
  if (!jam.members.some((member) => member.userId === me.id)) return err('You are not in this jam', 403);
  const data = await jamAnimeState(params.id, me.id, me.isAdmin);
  if (!data) return err('Jam not found', 404);
  return json(data);
});

export const PATCH = handle(async (req, { params }: Ctx) => {
  const me = await requireUser();
  const body = await req.json().catch(() => ({}));
  const action = typeof body.action === 'string' ? body.action.toLowerCase() : '';
  const episodeId = Number(body.episodeId);
  const position = Number(body.position);
  try {
    const data = await setJamAnimeState({
      jamId: params.id,
      viewerId: me.id,
      viewerIsAdmin: me.isAdmin,
      action,
      episodeId: Number.isInteger(episodeId) ? episodeId : undefined,
      position: Number.isFinite(position) ? position : undefined,
    });
    if (!data) return err('Jam not found', 404);
    return json(data);
  } catch (error) {
    return err(error instanceof Error ? error.message : 'Could not update anime playback', 400);
  }
});
