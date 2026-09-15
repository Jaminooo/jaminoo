import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';

export const GET = handle(async () => {
  const me = await requireUser();
  const memberships = await prisma.jamMember.findMany({
    where: { userId: me.id },
    include: {
      jam: {
        include: {
          members: true,
          messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      },
    },
    orderBy: { joinedAt: 'desc' },
  });

  return json({
    jams: memberships.map((m) => ({
      id: m.jam.id,
      name: m.jam.name,
      desc: m.jam.desc,
      type: m.jam.type,
      ownerId: m.jam.ownerId,
      createdAt: m.jam.createdAt.toISOString(),
      members: m.jam.members.length,
      lastActive: m.jam.messages[0]?.createdAt.toISOString() ?? m.jam.createdAt.toISOString(),
    })),
  });
});

// POST { name, desc?, type: 'PUBLIC'|'PRIVATE' }
export const POST = handle(async (req) => {
  const me = await requireUser();
  const { name, desc, type } = (await req.json()) as { name?: string; desc?: string; type?: string };
  if (!name || name.trim().length < 2 || name.trim().length > 40) return err('Name must be 2–40 characters');
  const jtype = type === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC';

  const last = await prisma.jam.findMany({ orderBy: { id: 'desc' }, take: 1 });
  let seq = 1;
  if (last[0]?.id?.startsWith('J')) seq = parseInt(last[0].id.slice(1), 10) + 1;
  const id = `J${seq}`;

  const jam = await prisma.jam.create({
    data: {
      id,
      name: name.trim(),
      desc: (desc ?? '').trim().slice(0, 120),
      type: jtype,
      ownerId: me.id,
      members: { create: { userId: me.id } },
    },
  });
  return json({ ok: true, jam: { id: jam.id, name: jam.name, desc: jam.desc, type: jam.type } }, 201);
});