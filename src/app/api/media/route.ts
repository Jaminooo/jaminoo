import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { MAX_PROFILE_MEDIA, MAX_MEDIA_BYTES, ALLOWED_MEDIA_TYPES, uidDisplay } from '@/lib/constants';
import { randomBytes } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

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
  if (!ALLOWED_MEDIA_TYPES.includes(file.type)) return err('Only jpg, png, webp allowed');

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const id = `${me.id}-${Date.now()}-${randomBytes(3).toString('hex')}`;
  const filename = `${id}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());

  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, filename), buf);

  const record = await prisma.media.create({
    data: { id, userId: me.id, kind: 'IMAGE', filename, mime: file.type, size: file.size },
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