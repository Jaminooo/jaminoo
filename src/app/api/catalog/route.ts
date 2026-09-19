import { handle, json, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';

function parse(item: any) {
  return { ...item, genres: safeJson(item.genres), chaptersList: undefined };
}
function safeJson(raw: string) { try { const value = JSON.parse(raw || '[]'); return Array.isArray(value) ? value : []; } catch { return []; } }
export const GET = handle(async (req: Request) => {
  await requireUser();
  const params = new URL(req.url).searchParams;
  const kind = (params.get('kind') || 'ANIME').toUpperCase();
  const q = (params.get('q') || '').trim().slice(0, 100);
  const featuredOnly = params.get('featured') === '1';
  const item = params.get('slug');
  if (item) {
    const found = await prisma.mediaCatalogItem.findFirst({ where: { slug: item, kind, published: true }, include: { chaptersList: { where: { published: true }, orderBy: { number: 'desc' } } } });
    return json({ item: found ? { ...parse(found), chaptersList: found.chaptersList.map((chapter) => ({ ...chapter, pages: safeJson(chapter.pages) })) } : null });
  }
  const where: any = { kind, published: true };
  if (featuredOnly) where.featured = true;
  if (q) where.OR = [{ title: { contains: q, mode: 'insensitive' } }, { original: { contains: q, mode: 'insensitive' } }, { studio: { contains: q, mode: 'insensitive' } }];
  const items = await prisma.mediaCatalogItem.findMany({ where, orderBy: [{ featured: 'desc' }, { updatedAt: 'desc' }], take: 100 });
  return json({ items: items.map(parse) });
});
