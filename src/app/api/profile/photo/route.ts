import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';

// POST /api/profile/photo { mediaId } — set an uploaded photo as profile picture
export const POST = handle(async (req) => {
  const me = await requireUser();
  const { mediaId } = (await req.json()) as { mediaId?: string };
  if (!mediaId) return err('Missing mediaId');

  const media = await prisma.media.findUnique({ where: { id: mediaId } });
  if (!media) return err('Not found', 404);
  if (media.userId !== me.id) return err('Forbidden', 403);

  await prisma.user.update({ where: { id: me.id }, data: { profilePhotoId: media.id } });
  return json({ ok: true, avatarPhoto: `/api/media/${media.id}` });
});

// DELETE /api/profile/photo — clear profile photo, back to preset avatars
export const DELETE = handle(async () => {
  const me = await requireUser();
  await prisma.user.update({ where: { id: me.id }, data: { profilePhotoId: null } });
  return json({ ok: true, avatarPhoto: null });
});