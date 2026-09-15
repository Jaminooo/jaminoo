import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { pubUser } from '@/lib/users';
import { livePublish } from '@/lib/live-publish';

type Ctx = { params: { id: string } };

// GET /api/jams/[id]/messages — poll messages newer than `afterId`
export const GET = handle(async (req, { params }: Ctx) => {
  const me = await requireUser();
  const jam = await prisma.jam.findUnique({ where: { id: params.id }, include: { members: true } });
  if (!jam) return err('Jam not found', 404);
  if (!jam.members.some((m) => m.userId === me.id)) return err('You are not in this jam', 403);

  const afterId = Number(new URL(req.url).searchParams.get('afterId'));
  const messages = await prisma.jamMessage.findMany({
    where: {
      jamId: jam.id,
      ...(Number.isFinite(afterId) && afterId > 0 ? { id: { gt: afterId } } : {}),
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          avatarId: true,
          bio: true,
          github: true,
          createdAt: true,
          profilePhotoId: true,
        },
      },
    },
    orderBy: { id: 'asc' },
    take: 200,
  });

  return json({
    messages: messages.map((m) => ({
      id: m.id,
      userId: m.userId,
      text: m.text,
      createdAt: m.createdAt.toISOString(),
      user: pubUser(m.user),
    })),
  });
});

// POST /api/jams/[id]/messages  { text }
export const POST = handle(async (req, { params }: Ctx) => {
  const me = await requireUser();
  const { text } = (await req.json()) as { text?: string };
  if (!text || !text.trim()) return err('Empty message');
  const textClean = text.trim().slice(0, 1000);

  const jam = await prisma.jam.findUnique({ where: { id: params.id }, include: { members: true } });
  if (!jam) return err('Jam not found', 404);
  if (!jam.members.some((m) => m.userId === me.id)) return err('You are not in this jam', 403);

  const msg = await prisma.jamMessage.create({
    data: { jamId: jam.id, userId: me.id, text: textClean },
  });
  const payload = {
    jamId: jam.id,
    id: msg.id,
    userId: me.id,
    text: msg.text,
    createdAt: msg.createdAt.toISOString(),
    user: pubUser(me),
  };
  livePublish(`jam:${jam.id}`, 'chat:new', payload);
  return json(
    {
      ok: true,
      msg: {
        id: payload.id,
        userId: payload.userId,
        text: payload.text,
        createdAt: payload.createdAt,
        user: payload.user,
      },
    },
    201
  );
});