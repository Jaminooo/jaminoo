import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { animePayload, animeEpisodePayload, parseGenres } from '@/lib/anime';

type Ctx = { params: { slug: string } };

export const GET = handle(async (_req, { params }: Ctx) => {
  await requireUser();
  const slug = params.slug;
  const anime = await prisma.anime.findUnique({ where: { slug } });
  if (!anime || anime.visibility === 'HIDDEN') return err('Anime not found', 404);

  const episodes = await prisma.animeEpisode.findMany({
    where: { animeId: anime.id },
    orderBy: [{ season: 'asc' }, { number: 'asc' }, { id: 'asc' }],
  });

  return json({
    anime: animePayload(anime),
    genres: parseGenres(anime.genres),
    episodes: episodes.map(animeEpisodePayload),
  });
});
