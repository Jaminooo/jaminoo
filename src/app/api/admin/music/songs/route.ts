import { handle, json, err, requireAdmin } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { songAdminPayload, safeJsonArr } from '@/lib/music-cms';
import { deleteMusicFile } from '@/lib/music';

export const GET = handle(async (req) => {
  await requireAdmin();
  const url = new URL(req.url);
  const q = (url.searchParams.get('q') ?? '').trim();
  const artistId = Number(url.searchParams.get('artistId')) || 0;
  const albumId = Number(url.searchParams.get('albumId')) || 0;
  const genre = (url.searchParams.get('genre') ?? '').trim();
  const featured = url.searchParams.get('featured') === '1';
  const hasFeatured = url.searchParams.has('featured');
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
  const per = Math.min(50, Math.max(5, Number(url.searchParams.get('per')) || 25));

  const where: any = {};
  if (q) where.OR = [{ title: { contains: q } }, { label: { contains: q } }, { producer: { contains: q } }, { artist: { name: { contains: q } } }];
  if (artistId) where.artistId = artistId;
  if (albumId) where.albumId = albumId;
  if (genre) where.genres = { contains: genre };
  if (hasFeatured) where.featured = featured;

  const [total, rows] = await Promise.all([
    prisma.song.count({ where }),
    prisma.song.findMany({
      where,
      include: {
        artist: { select: { id: true, name: true, coverFile: true } },
        album: { select: { id: true, title: true, coverFile: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * per,
      take: per,
    }),
  ]);

  return json({ rows: rows.map((r) => songAdminPayload(r)), total, page, pages: Math.max(1, Math.ceil(total / per)) });
});

export const POST = handle(async (req) => {
  await requireAdmin();
  const b = await req.json();
  const title = (b.title ?? '').toString().trim();
  const artistId = Number(b.artistId);
  if (!title || title.length > 200) return err('Title is required (max 200)');
  if (!Number.isInteger(artistId) || artistId <= 0) return err('Artist is required');

  const artist = await prisma.artist.findUnique({ where: { id: artistId } });
  if (!artist) return err('Artist not found');

  const feat = safeJsonArr(b.featArtistIds);
  const genres = safeJsonArr(b.genres);
  const albumId = b.albumId ? Number(b.albumId) : null;
  if (albumId) {
    const album = await prisma.album.findUnique({ where: { id: albumId } });
    if (!album) return err('Album not found');
  }

  const song = await prisma.song.create({
    data: {
      title,
      artistId,
      featArtistIds: JSON.stringify(feat),
      albumId,
      trackNo: Number(b.trackNo) || 0,
      durationSec: Number(b.durationSec) || 0,
      genres: JSON.stringify(genres),
      producer: (b.producer ?? '').toString().trim(),
      label: (b.label ?? '').toString().trim(),
      year: Number(b.year) || 0,
      explicit: !!b.explicit,
      featured: !!b.featured,
      lyrics: (b.lyrics ?? '').toString(),
      lrc: (b.lrc ?? '').toString(),
      coverFile: (b.coverFile ?? '').toString(),
      audioFile: (b.audioFile ?? '').toString(),
      audioLink: (b.audioLink ?? '').toString().trim(),
    },
    include: {
      artist: { select: { id: true, name: true, coverFile: true } },
      album: { select: { id: true, title: true, coverFile: true } },
    },
  });

  return json({ ok: true, song: songAdminPayload(song) }, 201);
});