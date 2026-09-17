import { handle, json, err } from '@/lib/api';
import { prisma } from '@/lib/prisma';

type Ctx = { params: { id: string } };

export const GET = handle(async (_req, { params }: Ctx) => {
  const moment = await prisma.jamMoment.findUnique({ where: { id: params.id }, include: { jam: { select: { id: true, name: true, kind: true, desc: true } }, user: { select: { username: true, avatarId: true, profilePhotoId: true } } } });
  if (!moment) return err('Moment not found', 404);
  return json({ moment: { ...moment, snapshot: JSON.parse(moment.snapshot || '{}'), createdAt: moment.createdAt.toISOString(), user: { ...moment.user, avatarPhoto: moment.user.profilePhotoId ? `/api/media/${moment.user.profilePhotoId}` : null } } });
});
