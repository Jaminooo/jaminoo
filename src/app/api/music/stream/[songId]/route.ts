import { handle, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { musicFilePath, streamFile } from '@/lib/music';
import { DEFAULT_FILE_PATHS } from '@/lib/default-assets';

const MIME_BY_EXT: Record<string, string> = {
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  m4a: 'audio/x-m4a',
  aac: 'audio/aac',
  flac: 'audio/flac',
  mp4: 'audio/mp4',
};

type Ctx = { params: { songId: string } };

export const GET = handle(async (req, { params }: Ctx) => {
  await requireUser();
  const id = Number(params.songId);
  if (!Number.isInteger(id) || id <= 0) return err('Not found', 404);
  const song = await prisma.song.findUnique({ where: { id } });
  if (!song || !song.audioFile) return err('Not found', 404);

  const filePath = musicFilePath(song.audioFile);
  if (!filePath) {
    // Uploaded audio was wiped on deploy — stream the bundled demo track.
    return streamFile(req, DEFAULT_FILE_PATHS.audio, 'audio/mpeg');
  }

  if (song.plays < 1000000 && !req.headers.get('range')) {
    prisma.song
      .update({ where: { id }, data: { plays: { increment: 1 } } })
      .catch(() => {});
  }

  const ext = (song.audioFile.split('.').pop() ?? 'mp3').toLowerCase();
  return streamFile(req, filePath, MIME_BY_EXT[ext] ?? 'audio/mpeg');
});