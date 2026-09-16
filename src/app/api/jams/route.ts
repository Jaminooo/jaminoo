import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { JAM_KINDS } from '@/lib/constants';
import { randomBytes } from 'crypto';

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
      kind: m.jam.kind,
      ownerId: m.jam.ownerId,
      closed: m.jam.closed,
      createdAt: m.jam.createdAt.toISOString(),
      members: m.jam.members.length,
      lastActive: m.jam.messages[0]?.createdAt.toISOString() ?? m.jam.createdAt.toISOString(),
    })),
  });
});

// POST { name, desc?, type: 'PUBLIC'|'PRIVATE', kind?: 'CHAT'|'MOVIE'|'MUSIC'|'HANGOUT' }
export const POST = handle(async (req) => {
  const me = await requireUser();
  const { name, desc, type, kind } = (await req.json()) as { name?: string; desc?: string; type?: string; kind?: string };
  if (!name || name.trim().length < 2 || name.trim().length > 40) return err('Name must be 2–40 characters');
  const jtype = type === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC';
  const jkind = JAM_KINDS.includes((kind ?? '').toUpperCase() as any) ? (kind ?? 'CHAT').toUpperCase() : 'CHAT';

  const ownedCount = await prisma.jam.count({ where: { ownerId: me.id } });
  if (ownedCount >= 1) return err('You can only own one jam', 403);

  const id = `J${Date.now().toString(36)}${randomBytes(4).toString('hex').toUpperCase()}`;

  const jam = await prisma.jam.create({
    data: {
      id,
      name: name.trim(),
      desc: (desc ?? '').trim().slice(0, 120),
      type: jtype,
      kind: jkind,
      ownerId: me.id,
      members: { create: { userId: me.id, role: 'HOST' } },
    },
  });
  return json({ ok: true, jam: { id: jam.id, name: jam.name, desc: jam.desc, type: jam.type, kind: jam.kind } }, 201);
});