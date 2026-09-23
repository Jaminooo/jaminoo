import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { cinemaPayload } from '@/lib/jam-cinema';

type Ctx = { params: { id: string } };

// GET /api/cinema/:id — single public cinema title (used by the watch page)
export const GET = handle(async (_req, { params }: Ctx) => {
  await requireUser();
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return err('Invalid cinema id', 400);
  const video = await prisma.cinemaVideo.findFirst({ where: { id, visibility: 'PUBLIC' } });
  if (!video) return err('Cinema title not found', 404);
  return json({ item: cinemaPayload(video) });
});