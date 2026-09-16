import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { unlink } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

type Ctx = { params: { id: string } };

async function canAccessMedia(meId: number, mediaId: string, isAdmin = false) {
  const media = await prisma.media.findUnique({
    where: { id: mediaId },
    select: {
      id: true,
      userId: true,
      profileUser: { select: { id: true } },
      messages: { select: { jamId: true } },
      dmMessages: { select: { convId: true } },
    },
  });
  if (!media) return false;
  if (isAdmin) return true;
  if (media.userId === meId) return true;

  if (media.profileUser) {
    const otherId = media.profileUser.id;
    if (otherId === meId) return true;
    const friend = await prisma.friendRequest.findFirst({
      where: { status: 'FRIENDS', OR: [{ fromId: meId, toId: otherId }, { fromId: otherId, toId: meId }] },
      select: { id: true },
    });
    if (friend) return true;
    const shared = await prisma.jamMember.count({
      where: { userId: meId, jam: { members: { some: { userId: otherId } } } },
    });
    if (shared > 0) return true;
    const publicJam = await prisma.jam.count({
      where: { ownerId: otherId, type: 'PUBLIC', closed: false },
    });
    if (publicJam > 0) return true;
    return false;
  }

  if (media.messages.length > 0) {
    const member = await prisma.jamMember.findUnique({
      where: { jamId_userId: { jamId: media.messages[0].jamId, userId: meId } },
    });
    return !!member;
  }

  if (media.dmMessages.length > 0) {
    const conv = await prisma.conversation.findUnique({ where: { id: media.dmMessages[0].convId } });
    return !!conv && (conv.userA === meId || conv.userB === meId);
  }

  return false;
}

export const GET = handle(async (_req, { params }: Ctx) => {
  const me = await requireUser();
  const media = await prisma.media.findUnique({ where: { id: params.id } });
  if (!media) return err('Not found', 404);
  if (!(await canAccessMedia(me.id, media.id, me.isAdmin))) return err('Forbidden', 403);
  const fpath = path.join(UPLOAD_DIR, media.filename);
  try {
    const fs = await import('fs/promises');
    const buf = await fs.readFile(fpath);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        'Content-Type': media.mime,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, max-age=3600',
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