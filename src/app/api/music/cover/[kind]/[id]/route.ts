import { handle, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { musicFilePath, streamFile } from '@/lib/music';
import { NextResponse } from 'next/server';
import { COVER_KIND_DEFAULT, COVER_KIND_MIME, MusicCoverKind } from '@/lib/default-assets';

const MIME_BY_EXT: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};

type Ctx = { params: { kind: string; id: string } };

export const GET = handle(async (req, { params }: Ctx) => {
  await requireUser({ allowGuest: true });
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return err('Not found', 404);

  const kind = params.kind;
  const pick = async () => {
    if (kind === 'song') return prisma.song.findUnique({ where: { id }, select: { coverFile: true } });
    if (kind === 'album') return prisma.album.findUnique({ where: { id }, select: { coverFile: true } });
    if (kind === 'artist') return prisma.artist.findUnique({ where: { id }, select: { coverFile: true } });
    if (kind === 'playlist') return prisma.musicPlaylist.findUnique({ where: { id }, select: { coverFile: true } });
    return null;
  };
const rec = await pick();
  if (!rec || !rec.coverFile) return err('Not found', 404);
  if (/^https?:\/\//i.test(rec.coverFile)) return NextResponse.redirect(rec.coverFile);

  const filePath = musicFilePath(rec.coverFile);
  if (!filePath) {
    // Uploaded cover was wiped on deploy — serve the bundled default cover.
    const coverKind = (kind as MusicCoverKind) in COVER_KIND_DEFAULT ? (kind as MusicCoverKind) : 'song';
    return streamFile(req, COVER_KIND_DEFAULT[coverKind], COVER_KIND_MIME[coverKind]);
  }

  const ext = (rec.coverFile.split('.').pop() ?? 'jpg').toLowerCase();
  return streamFile(req, filePath, MIME_BY_EXT[ext] ?? 'image/jpeg');
});
