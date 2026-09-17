import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';

type Ctx = { params: { id: string } };

export const POST = handle(async (req, { params }: Ctx) => {
  const me = await requireUser();
  const creatorId = Number(params.id);
  if (!Number.isInteger(creatorId) || creatorId <= 0) return err('Invalid creator', 400);
  if (creatorId === me.id) return err('You cannot follow yourself', 400);
  const hub = new URL(req.url).searchParams.get('hub')?.toUpperCase() === 'MUSIC' ? 'MUSIC' : 'VIDEO';
  const application = await prisma.creatorApplication.findUnique({ where: { userId_hub: { userId: creatorId, hub } }, select: { status: true, channelName: true } });
  if (application?.status !== 'APPROVED') return err('This creator is not approved', 404);
  const existing = await prisma.creatorFollow.findUnique({ where: { followerId_creatorId: { followerId: me.id, creatorId } } });
  if (existing) {
    await prisma.creatorFollow.delete({ where: { id: existing.id } });
    return json({ following: false });
  }
  await prisma.creatorFollow.create({ data: { followerId: me.id, creatorId } });
  await prisma.notification.create({ data: { userId: creatorId, kind: 'CREATOR_FOLLOW', payload: JSON.stringify({ followerId: me.id, username: me.username, hub }) } });
  return json({ following: true });
});
