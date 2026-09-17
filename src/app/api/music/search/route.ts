import { handle, json, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { songPayload } from '@/lib/music-cms';
import { entityCover } from '@/lib/music-catalog';

export const GET = handle(async (req) => {
  const me = await requireUser();
  const q = (new URL(req.url).searchParams.get('q') ?? '').trim();
  const CONTAINS = q ? { contains: q } : undefined;

  const [songs, artists, albums] = await Promise.all([
    prisma.song.findMany({
      where: q ? { OR: [{ title: CONTAINS }, { artist: { name: CONTAINS } }] } : undefined,
      include: {
        artist: { select: { id: true, name: true, coverFile: true } },
        album: { select: { id: true, title: true, coverFile: true } },
      },
      orderBy: q ? undefined : { plays: 'desc' },
      take: q ? 10 : 8,
    }),
    q
      ? prisma.artist.findMany({ where: { OR: [{ name: CONTAINS }, { genres: { contains: q } }] }, take: 8 })
      : prisma.artist.findMany({ orderBy: { name: 'asc' }, take: 8 }),
    q
      ? prisma.album.findMany({ where: { OR: [{ title: CONTAINS }, { artist: { name: CONTAINS } }] }, include: { artist: { select: { id: true, name: true } } }, take: 8 })
      : [],
  ]);

  return json({
    songs: songs.map((s) => songPayload(s)),
    artists: artists.map((a) => ({
      id: a.id,
      name: a.name,
      coverUrl: entityCover('artist', a.id, a.coverFile),
      bio: a.bio,
      genres: JSON.parse(a.genres || '[]'),
    })),
    albums: albums.map((a) => ({
      id: a.id,
      title: a.title,
      artist: a.artist?.name ?? '',
      year: a.year,
      type: a.type,
      coverUrl: entityCover('album', a.id, a.coverFile),
    })),
  });
});
