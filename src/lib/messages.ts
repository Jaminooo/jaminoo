import { pubUser } from '@/lib/users';
import { MAX_VOICE_BYTES, ALLOWED_VOICE_TYPES } from '@/lib/constants';
import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

type MsgRow = {
  id: number;
  userId: number;
  kind: string;
  text: string;
  mediaId: string | null;
  createdAt: Date;
  seenAt?: Date | null;
  media?: { id: string } | null;
  user: any;
  reactions?: { emoji: string; userId: number }[];
};

export function msgPayload(m: MsgRow, meId?: number) {
  const reactions: { emoji: string; count: number; me: boolean }[] = [];
  for (const r of m.reactions ?? []) {
    const cur = reactions.find((x) => x.emoji === r.emoji);
    if (cur) cur.count++;
    else reactions.push({ emoji: r.emoji, count: 1, me: meId != null && r.userId === meId });
  }
  return {
    id: m.id,
    userId: m.userId,
    kind: m.kind ?? 'TEXT',
    text: m.text,
    createdAt: m.createdAt.toISOString(),
    media: m.mediaId ? { id: m.mediaId, url: `/api/media/${m.mediaId}` } : null,
    user: pubUser(m.user),
    reactions,
    seenAt: m.seenAt ? m.seenAt.toISOString() : null,
  };
}

export async function storeVoice(file: File, userId: number) {
  if (file.size <= 0) throw new Error('Empty voice message');
  if (file.size > MAX_VOICE_BYTES) throw new Error('Voice too large (max 3 MB)');
  if (!ALLOWED_VOICE_TYPES.includes(file.type)) throw new Error('Unsupported audio type');

  const ext = file.type === 'audio/ogg' ? 'ogg' : file.type === 'audio/mpeg' ? 'mp3' : file.type === 'audio/mp4' ? 'm4a' : 'webm';
  const id = `${userId}-${Date.now()}-${randomBytes(3).toString('hex')}`;
  const filename = `${id}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());

  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, filename), buf);

  return prisma.media.create({
    data: { id, userId, kind: 'VOICE', filename, mime: file.type, size: file.size },
  });
}