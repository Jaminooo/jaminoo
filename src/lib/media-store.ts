import { prisma } from '@/lib/prisma';

// Uploaded bytes are mirrored into Postgres (Media.data) so they survive
// ephemeral disk wipes (Render free tier). Videos/music are too large for a
// free-tier DB, so only payloads at or below this size are mirrored; bigger
// files keep the disk path plus the bundled fallback on the serving side.
export const DB_MEDIA_MAX_BYTES = 5 * 1024 * 1024;

/** Whether a payload should be mirrored into Postgres. */
export function shouldPersistMediaBytes(size: number, mime: string): boolean {
  return size > 0 && size <= DB_MEDIA_MAX_BYTES && !mime.startsWith('video/');
}

/** Best-effort DB mirror; never throws so upload flow is unaffected. */
export async function persistMediaBytes(id: string, buf: Buffer, mime: string) {
  if (!buf || !shouldPersistMediaBytes(buf.length, mime)) return;
  try {
    const bytes = new Uint8Array(buf.byteLength);
    bytes.set(buf);
    await prisma.media.update({ where: { id }, data: { data: bytes } });
  } catch {
    // Column missing (migration not applied yet) or DB hiccup: disk copy stays.
  }
}