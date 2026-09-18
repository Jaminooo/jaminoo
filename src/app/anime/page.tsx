import { AnimeHub } from '@/components/anime-hub';

export default async function AnimePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const tab = Array.isArray(sp.tab) ? sp.tab[0] : sp.tab;
  return <AnimeHub initialTab={tab === 'manga' ? 'manga' : 'anime'} />;
}