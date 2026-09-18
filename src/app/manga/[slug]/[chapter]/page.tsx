import { MangaReader } from '@/components/manga-reader';
import { mangaBySlug, chapterPages } from '@/data/manga';
import { notFound } from 'next/navigation';

export default async function MangaChapterPage({
  params,
}: {
  params: Promise<{ slug: string; chapter: string }>;
}) {
  const { slug, chapter } = await params;
  const manga = mangaBySlug(slug);
  const num = Number(chapter);
  if (!manga || !Number.isInteger(num) || num < 1 || num > manga.chapters) notFound();
  // pages resolved client-side for the sample chapter
  return <MangaReader slug={slug} chapter={num} />;
}