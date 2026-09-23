import { WatchPageView } from '@/components/watch-page-view';

// /watch/:source/:id — dedicated big-player page for a cinema/anime title.
export default async function WatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ source: string; id: string }>;
  searchParams: Promise<{ e?: string; q?: string }>;
}) {
  const [{ source, id }, sp] = await Promise.all([params, searchParams]);
  return <WatchPageView source={source} id={id} episodeParam={typeof sp.e === 'string' ? sp.e : undefined} qualityParam={typeof sp.q === 'string' ? sp.q : undefined} />;
}