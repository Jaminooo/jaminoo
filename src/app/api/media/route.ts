import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { MAX_PROFILE_MEDIA, MAX_MEDIA_BYTES, uidDisplay } from '@/lib/constants';
import { randomBytes } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { UPLOAD_DIR } from '@/lib/upload-storage';

function sniffImage(buf: Buffer): string | null {
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 && buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a) {
    return 'image/png';
  }
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return 'image/jpeg';
  }
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    return 'image/webp';
  }
  return null;
}

export const GET = handle(async () => {
  const me = await requireUser();
  const media = await prisma.media.findMany({
    where: { userId: me.id, kind: 'IMAGE' },
    orderBy: { createdAt: 'desc' },
  });
  return json({
    media: media.map((m) => ({
      id: m.id,
      mime: m.mime,
      size: m.size,
      createdAt: m.createdAt.toISOString(),
      url: `/api/media/${m.id}`,
      isProfile: me.profilePhotoId === m.id,
    })),
  });
});

export const POST = handle(async (req: Request) => {
  const me = await requireUser();

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return err('No file provided');

  const count = await prisma.media.count({ where: { userId: me.id, kind: 'IMAGE' } });
  if (count >= MAX_PROFILE_MEDIA) return err(`Maximum ${MAX_PROFILE_MEDIA} photos`);

  if (file.size > MAX_MEDIA_BYTES) return err('File too large (max 5 MB)');

  const hash = Buffer.from(await file.arrayBuffer());
  const mime = sniffImage(hash);
  if (!mime) return err('Only jpg, png, webp images allowed');

  const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
  const id = `${me.id}-${Date.now()}-${randomBytes(3).toString('hex')}`;
  const filename = `${id}.${ext}`;
  const buf = hash;

  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, filename), buf);

  const record = await prisma.media.create({
    data: { id, userId: me.id, kind: 'IMAGE', filename, mime, size: file.size },
  });

  return json(
    {
      ok: true,
      media: {
        id: record.id,
        mime: record.mime,
        size: record.size,
        createdAt: record.createdAt.toISOString(),
        url: `/api/media/${record.id}`,
        isProfile: false,
      },
    },
    201
  );
});
