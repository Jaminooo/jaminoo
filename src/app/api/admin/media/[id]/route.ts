import { handle, json, err, requireAdmin } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { pushAdminEvent } from '@/lib/admin';
import { unlink } from 'fs/promises';
import path from 'path';
import { UPLOAD_DIR } from '@/lib/upload-storage';

type Ctx = { params: { id: string } };

export const DELETE = handle(async (_req, { params }: Ctx) => {
  await requireAdmin();
  const id = params.id;
  const media = await prisma.media.findUnique({
    where: { id },
    select: { id: true, filename: true, kind: true, userId: true, user: { select: { username: true } } },
  });
  if (!media) return err('Not found', 404);
  await prisma.media.delete({ where: { id } });
  try {
    await unlink(path.join(UPLOAD_DIR, media.filename));
  } catch {
    // file already gone — treat as success
  }
  pushAdminEvent('error', `${media.kind} from @${media.user.username} deleted`, {
    action: 'media-delete',
    id,
  });
  return json({ ok: true });
});
