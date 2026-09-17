import { handle, json, requireAdmin } from '@/lib/api';
import { prisma } from '@/lib/prisma';

export const GET = handle(async () => {
  await requireAdmin();
  const [songs, artists, albums, playlists, totalPlays, featured, recent] = await Promise.all([
    prisma.song.count(),
    prisma.artist.count(),
    prisma.album.count(),
    prisma.musicPlaylist.count(),
    prisma.song.aggregate({ _sum: { plays: true } }),
    prisma.song.findMany({ where: { featured: true }, include: { artist: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' }, take: 5 }),
    prisma.song.findMany({ include: { artist: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' }, take: 5 }),
  ]);

  return json({
    stats: {
      songs,
      artists,
      albums,
      playlists,
      totalPlays: totalPlays._sum.plays ?? 0,
    },
    featured: recent.map((s) => ({ ...s, _featured: s.featured })),
    recent: recent.map((s) => ({
      id: s.id,
      title: s.title,
      artist: s.artist?.name ?? '',
      plays: s.plays,
      featured: s.featured,
      createdAt: s.createdAt.toISOString(),
    })),
  });
});