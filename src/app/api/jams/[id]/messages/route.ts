import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';

type Ctx = { params: { id: string } };

// GET /api/jams/[id]/messages — poll messages (newer than `after` ts)
export const GET = handle(async (req, { params }: Ctx) => {
  const me = await requireUser();
  const jam = await prisma.jam.findUnique({ where: { id: params.id }, include: { members: true } });
  if (!jam) return err('Jam not found', 404);
  if (!jam.members.some((m) => m.userId === me.id)) return err('You are not in this jam', 403);

  const after = new URL(req.url).searchParams.get('after');
  const messages = await prisma.jamMessage.findMany({
    where: {
      jamId: jam.id,
      ...(after ? { createdAt: { gt: new Date(after) } } : {}),
    },
    include: { user: { select: { id: true, username: true, avatarId: true, github: true } } },
    orderBy: { createdAt: 'asc' },
    take: 200,
  });

  return json({
    messages: messages.map((m) => ({
      id: m.id,
      userId: m.userId,
      text: m.text,
      createdAt: m.createdAt.toISOString(),
      user: { id: m.user.id, username: m.user.username, avatarId: m.user.avatarId, github: m.user.github },
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
  return json(
    {
      ok: true,
      msg: {
        id: msg.id,
        userId: me.id,
        text: msg.text,
        createdAt: msg.createdAt.toISOString(),
        user: { id: me.id, username: me.username, avatarId: me.avatarId, github: me.github },
      },
    },
    201
  );
});