import { MangaTimeline } from '@/components/manga-timeline';
import { mangaBySlug } from '@/data/manga';
import { notFound } from 'next/navigation';

export default async function MangaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const manga = mangaBySlug(slug);
  if (!manga) notFound();
  // generate at build render; chapters resolved client-side from manga.chapters
  return <MangaTimeline slug={slug} />;
}