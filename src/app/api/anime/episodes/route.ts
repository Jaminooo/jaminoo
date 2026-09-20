import { handle, json, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { animeEpisodePayload } from '@/lib/anime';

// GET /api/anime/episodes — all public episodes for the watch-party picker
export const GET = handle(async () => {
  await requireUser();
  const rows = await prisma.animeEpisode.findMany({
    where: { anime: { visibility: 'PUBLIC' } },
    orderBy: { id: 'desc' },
    take: 120,
    include: { anime: { select: { id: true, title: true } } },
  });
  return json({ items: rows.map((e) => ({ ...animeEpisodePayload(e), animeTitle: e.anime.title })) });
});
