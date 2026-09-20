import { handle, json, err } from '@/lib/api';
import { requireHubAdmin } from '@/lib/roles';
const ADMIN_SCOPE = 'MUSIC';
import { prisma } from '@/lib/prisma';
import { songAdminPayload, safeJsonArr } from '@/lib/music-cms';
import { deleteMusicFile } from '@/lib/music';

type Ctx = { params: { id: string } };

export const PATCH = handle(async (req, { params }: Ctx) => {
  await requireHubAdmin(ADMIN_SCOPE);
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return err('Not found', 404);
  const song = await prisma.song.findUnique({ where: { id } });
  if (!song) return err('Not found', 404);

  const b = await req.json();
  const data: any = {};

  if (typeof b.title === 'string') {
    const t = b.title.trim();
    if (!t || t.length > 200) return err('Title is required (max 200)');
    data.title = t;
  }
  if (b.artistId !== undefined) {
    const aid = Number(b.artistId);
    if (!Number.isInteger(aid) || aid <= 0) return err('Artist is required');
    const artist = await prisma.artist.findUnique({ where: { id: aid } });
    if (!artist) return err('Artist not found');
    data.artistId = aid;
  }
  if (b.albumId !== undefined) {
    if (b.albumId === null || b.albumId === '') data.albumId = null;
    else {
      const albumId = Number(b.albumId);
      const album = await prisma.album.findUnique({ where: { id: albumId } });
      if (!album) return err('Album not found');
      data.albumId = albumId;
    }
  }
  if (b.featArtistIds !== undefined) data.featArtistIds = JSON.stringify(safeJsonArr(b.featArtistIds));
  if (b.genres !== undefined) data.genres = JSON.stringify(safeJsonArr(b.genres));
  if (b.trackNo !== undefined) data.trackNo = Number(b.trackNo) || 0;
  if (b.durationSec !== undefined) data.durationSec = Number(b.durationSec) || 0;
  if (b.producer !== undefined) data.producer = b.producer.toString();
  if (b.label !== undefined) data.label = b.label.toString();
  if (b.year !== undefined) data.year = Number(b.year) || 0;
  if (b.explicit !== undefined) data.explicit = !!b.explicit;
  if (b.featured !== undefined) data.featured = !!b.featured;
  if (b.lyrics !== undefined) data.lyrics = b.lyrics.toString();
  if (b.lrc !== undefined) data.lrc = b.lrc.toString();
  if (b.coverFile !== undefined) {
    if (song.coverFile && song.coverFile !== b.coverFile) deleteMusicFile(song.coverFile);
    data.coverFile = b.coverFile.toString();
  }
  if (b.audioFile !== undefined) {
    if (song.audioFile && song.audioFile !== b.audioFile) deleteMusicFile(song.audioFile);
    data.audioFile = b.audioFile.toString();
  }
  if (b.audioLink !== undefined) data.audioLink = b.audioLink.toString().trim();

  const updated = await prisma.song.update({
    where: { id },
    data,
    include: {
      artist: { select: { id: true, name: true, coverFile: true } },
      album: { select: { id: true, title: true, coverFile: true } },
    },
  });

  return json({ ok: true, song: songAdminPayload(updated) });
});

export const DELETE = handle(async (_req, { params }: Ctx) => {
  await requireHubAdmin(ADMIN_SCOPE);
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return err('Not found', 404);
  const song = await prisma.song.findUnique({ where: { id } });
  if (!song) return err('Not found', 404);
  if (song.audioFile) deleteMusicFile(song.audioFile);
  if (song.coverFile) deleteMusicFile(song.coverFile);
  await prisma.song.delete({ where: { id } });
  return json({ ok: true });
});