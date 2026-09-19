import { handle, json, err, requireAdmin } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { pushAdminEvent } from '@/lib/admin';
import { pushNotification } from '@/lib/notifications';

export const GET = handle(async (req: Request) => {
  await requireAdmin();
  const params = new URL(req.url).searchParams;
  const status = (params.get('status') ?? '').toUpperCase();
  const hub = (params.get('hub') ?? '').toUpperCase();
  const query = params.get('q')?.trim() ?? '';
  const page = Math.max(1, Number(params.get('page') ?? 1));
  const per = Math.min(50, Math.max(1, Number(params.get('per') ?? 20)));
  const where: any = {};
  if (['PENDING', 'APPROVED', 'REJECTED'].includes(status)) where.status = status;
  if (['VIDEO', 'MUSIC'].includes(hub)) where.hub = hub;
  if (query) {
    where.OR = [
      { channelName: { contains: query } },
      { handle: { contains: query } },
      { user: { username: { contains: query } } },
    ];
  }
  const [applications, total] = await Promise.all([
    prisma.creatorApplication.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * per,
      take: per,
      include: { user: { select: { id: true, username: true, email: true } } },
    }),
    prisma.creatorApplication.count({ where }),
  ]);
  return json({
    rows: applications.map((application) => ({
      id: application.id,
      hub: application.hub,
      channelName: application.channelName,
      handle: application.handle,
      bio: application.bio,
      category: application.category,
      links: application.links,
      status: application.status,
      reviewNote: application.reviewNote,
      createdAt: application.createdAt.toISOString(),
      reviewedAt: application.reviewedAt?.toISOString() ?? null,
      user: application.user,
    })),
    total,
    page,
    per,
  });
});

export const PATCH = handle(async (req: Request) => {
  const admin = await requireAdmin();
  const body = await req.json().catch(() => ({}));
  const id = Number(body.id);
  const status = typeof body.status === 'string' ? body.status.toUpperCase() : '';
  const reviewNote = typeof body.reviewNote === 'string' ? body.reviewNote.trim().slice(0, 500) : '';
  if (!Number.isInteger(id) || !['PENDING', 'APPROVED', 'REJECTED'].includes(status)) return err('Invalid creator review');

  const application = await prisma.creatorApplication.findUnique({ where: { id } });
  if (!application) return err('Creator application not found', 404);
  const reviewed = status === 'PENDING' ? null : new Date();
  const updated = await prisma.creatorApplication.update({
    where: { id },
    data: { status, reviewNote, reviewerId: status === 'PENDING' ? null : admin.id, reviewedAt: reviewed },
  });
  await pushNotification(application.userId, 'CREATOR_REVIEW', { hub: application.hub, status, reviewNote });
  pushAdminEvent(status === 'APPROVED' ? 'ok' : status === 'REJECTED' ? 'warn' : 'admin', `${application.hub} creator application #${id} marked ${status.toLowerCase()}`, { action: 'creator-review', id, status });
  return json({ application: updated });
});
