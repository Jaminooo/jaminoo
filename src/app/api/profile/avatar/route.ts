import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';

export const PATCH = handle(async (req) => {
  const me = await requireUser();
  const { avatarId } = (await req.json()) as { avatarId?: number };
  if (avatarId == null || avatarId < 0 || avatarId > 11) return err('Invalid avatar');
  await prisma.user.update({ where: { id: me.id }, data: { avatarId, profilePhotoId: null } });
  return json({ ok: true, avatarId });
});