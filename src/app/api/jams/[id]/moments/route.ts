import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';

type Ctx = { params: { id: string } };

async function memberOf(jamId: string, userId: number) {
  const jam = await prisma.jam.findUnique({
    where: { id: jamId },
    select: { id: true, name: true, kind: true, members: { where: { userId }, select: { userId: true } } },
  });
  return jam && jam.members.length > 0 ? jam : null;
}

export const GET = handle(async (_req, { params }: Ctx) => {
  const me = await requireUser();
  const jam = await memberOf(params.id, me.id);
  if (!jam) return err('You are not in this jam', 403);
  const moments = await prisma.jamMoment.findMany({
    where: { jamId: params.id },
    orderBy: { createdAt: 'desc' },
    take: 40,
    include: { user: { select: { id: true, username: true, avatarId: true, profilePhotoId: true } } },
  });
  return json({ moments: moments.map((moment) => ({ ...moment, snapshot: JSON.parse(moment.snapshot || '{}'), createdAt: moment.createdAt.toISOString(), user: { ...moment.user, avatarPhoto: moment.user.profilePhotoId ? `/api/media/${moment.user.profilePhotoId}` : null } })) });
});

export const POST = handle(async (req, { params }: Ctx) => {
  const me = await requireUser();
  const jam = await memberOf(params.id, me.id);
  if (!jam) return err('You are not in this jam', 403);
  const body = await req.json().catch(() => ({}));
  const title = typeof body.title === 'string' ? body.title.trim().slice(0, 90) : '';
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 400) : '';
  const kind = typeof body.kind === 'string' ? body.kind.toUpperCase().slice(0, 24) : 'HIGHLIGHT';
  const snapshot = body.snapshot && typeof body.snapshot === 'object' ? JSON.stringify(body.snapshot).slice(0, 8000) : '{}';
  if (!title) return err('Add a title for this moment');
  const moment = await prisma.jamMoment.create({
    data: { jamId: params.id, userId: me.id, title, note, kind, snapshot },
    include: { user: { select: { id: true, username: true, avatarId: true, profilePhotoId: true } } },
  });
  return json({ moment: { ...moment, snapshot: JSON.parse(moment.snapshot), createdAt: moment.createdAt.toISOString(), user: { ...moment.user, avatarPhoto: moment.user.profilePhotoId ? `/api/media/${moment.user.profilePhotoId}` : null } } }, 201);
});

export const DELETE = handle(async (req, { params }: Ctx) => {
  const me = await requireUser();
  const jam = await memberOf(params.id, me.id);
  if (!jam) return err('You are not in this jam', 403);
  const id = new URL(req.url).searchParams.get('id') ?? '';
  if (!id) return err('Moment id is required');
  const deleted = await prisma.jamMoment.deleteMany({ where: { id, jamId: params.id, userId: me.id } });
  if (!deleted.count) return err('Moment not found', 404);
  return json({ ok: true });
});
