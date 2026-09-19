import { handle, json, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';

export const GET = handle(async () => {
  const me = await requireUser();
  const application = await prisma.creatorApplication.findUnique({
    where: { userId_hub: { userId: me.id, hub: 'VIDEO' } },
    select: { status: true, reviewNote: true, reviewedAt: true },
  });
  if (application?.status !== 'APPROVED') {
    return json({ status: application?.status ?? null, reviewNote: application?.reviewNote ?? '', reviewedAt: application?.reviewedAt?.toISOString() ?? null, analytics: null });
  }
  const since = new Date(Date.now() - 6 * 86400000);
  const [posts, followers] = await Promise.all([
    prisma.videoPost.findMany({
      where: { authorId: me.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { id: true, title: true, kind: true, visibility: true, createdAt: true, _count: { select: { likes: true, saves: true, comments: true } } },
    }),
    prisma.creatorFollow.count({ where: { creatorId: me.id } }),
  ]);
  const published = posts.filter((post) => post.visibility === 'PUBLIC');
  const totals = published.reduce((sum, post) => ({ likes: sum.likes + post._count.likes, saves: sum.saves + post._count.saves, comments: sum.comments + post._count.comments }), { likes: 0, saves: 0, comments: 0 });
  const trend = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(Date.now() - (6 - index) * 86400000);
    const key = date.toISOString().slice(0, 10);
    const dayPosts = published.filter((post) => post.createdAt.toISOString().slice(0, 10) === key);
    return { date: key, posts: dayPosts.length, interactions: dayPosts.reduce((n, post) => n + post._count.likes + post._count.saves + post._count.comments, 0) };
  });
  const recentInteractions = published.filter((post) => post.createdAt >= since).reduce((n, post) => n + post._count.likes + post._count.saves + post._count.comments, 0);
  return json({
    status: application.status,
    reviewNote: application.reviewNote,
    reviewedAt: application.reviewedAt?.toISOString() ?? null,
    analytics: {
      followers,
      published: published.length,
      drafts: posts.length - published.length,
      ...totals,
      interactions: totals.likes + totals.saves + totals.comments,
      recentInteractions,
      trend,
      topPosts: published.slice().sort((a, b) => (b._count.likes + b._count.saves + b._count.comments) - (a._count.likes + a._count.saves + a._count.comments)).slice(0, 5).map((post) => ({ id: post.id, title: post.title || 'Untitled post', kind: post.kind, interactions: post._count.likes + post._count.saves + post._count.comments })),
    },
  });
});
