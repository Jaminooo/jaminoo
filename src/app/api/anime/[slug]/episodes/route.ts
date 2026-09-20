import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { animeEpisodePayload, parseGenres } from '@/lib/anime';

type Ctx = { params: { slug: string } };

// GET /api/anime/:slug/episodes — episode list for a single anime
export const GET = handle(async (_req, { params }: Ctx) => {
  await requireUser();
  const anime = await prisma.anime.findUnique({ where: { slug: params.slug }, select: { id: true, visibility: true, genres: true } });
  if (!anime || anime.visibility === 'HIDDEN') return err('Anime not found', 404);
  const episodes = await prisma.animeEpisode.findMany({ where: { animeId: anime.id }, orderBy: [{ number: 'asc' }, { id: 'asc' }] });
  return json({ episodes: episodes.map(animeEpisodePayload), genres: parseGenres(anime.genres) });
});
