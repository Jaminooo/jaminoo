import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { unlink } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

type Ctx = { params: { id: string } };

export const GET = handle(async (_req, { params }: Ctx) => {
  const media = await prisma.media.findUnique({ where: { id: params.id } });
  if (!media) return err('Not found', 404);
  const fpath = path.join(UPLOAD_DIR, media.filename);
  try {
    const fs = await import('fs/promises');
    const buf = await fs.readFile(fpath);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        'Content-Type': media.mime,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch {
    return err('File missing', 404);
  }
});

export const DELETE = handle(async (_req, { params }: Ctx) => {
  const me = await requireUser();
  const media = await prisma.media.findUnique({ where: { id: params.id } });
  if (!media) return err('Not found', 404);
  // only owner may delete
  if (media.userId !== me.id) return err('Forbidden', 403);
  await prisma.media.delete({ where: { id: media.id } });
  try {
    await unlink(path.join(UPLOAD_DIR, media.filename));
  } catch {
    // file already gone — treat as success
  }
  return json({ ok: true });
});