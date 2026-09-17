import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { livePublish } from '@/lib/live-publish';
import { unlink } from 'fs/promises';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

type Ctx = { params: { id: string } };

// POST /api/jams/[id]/delete — owner (or admin) permanently deletes the jam and its voice files
export const POST = handle(async (_req, { params }: Ctx) => {
  const me = await requireUser();
  const jam = await prisma.jam.findUnique({ where: { id: params.id }, select: { id: true, ownerId: true } });
  if (!jam) return err('Jam not found', 404);
  if (jam.ownerId !== me.id && !me.isAdmin) return err('Only the owner can delete this jam', 403);

  const msgs = await prisma.jamMessage.findMany({ where: { jamId: jam.id }, select: { mediaId: true } });
  const mediaIds = msgs.map((m) => m.mediaId).filter(Boolean) as string[];
  if (mediaIds.length > 0) {
    const media = await prisma.media.findMany({ where: { id: { in: mediaIds } }, select: { id: true, filename: true } });
    await Promise.all(
      media.map((m) =>
        unlink(path.join(UPLOAD_DIR, m.filename)).catch(() => undefined)
      )
    );
    await prisma.media.deleteMany({ where: { id: { in: media.map((m) => m.id) } } });
  }

  await prisma.jam.delete({ where: { id: jam.id } });
  livePublish(`jam:${jam.id}`, 'jam:deleted', jam.id);
  return json({ ok: true });
});