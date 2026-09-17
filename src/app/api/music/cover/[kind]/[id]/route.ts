import { handle, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { musicFilePath, streamFile } from '@/lib/music';

const MIME_BY_EXT: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};

type Ctx = { params: { kind: string; id: string } };

export const GET = handle(async (req, { params }: Ctx) => {
  await requireUser();
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

  const filePath = musicFilePath(rec.coverFile);
  if (!filePath) return err('File missing', 404);

  const ext = (rec.coverFile.split('.').pop() ?? 'jpg').toLowerCase();
  return streamFile(req, filePath, MIME_BY_EXT[ext] ?? 'image/jpeg');
});