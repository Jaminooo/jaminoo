import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { jamCardPayload } from '@/lib/jam-card';
import { randomBytes } from 'crypto';

const CARD_INCLUDE = {
  owner: { select: { id: true, username: true, avatarId: true, profilePhotoId: true } },
  members: true,
  currentSong: { include: { artist: { select: { id: true, name: true } }, album: { select: { id: true, title: true, coverFile: true } } } },
};

export const GET = handle(async () => {
  const me = await requireUser();
  const memberships = await prisma.jamMember.findMany({
    where: { userId: me.id },
    include: {
      jam: {
        include: { ...CARD_INCLUDE, ...{ messages: { orderBy: { createdAt: 'desc' }, take: 1 } } },
      },
    },
    orderBy: { joinedAt: 'desc' },
  });

  return json({
    jams: memberships
      .filter((m) => m.jam.kind === 'MUSIC' && !m.jam.closed)
      .map((m) => ({
        ...jamCardPayload(m.jam, me.id),
        role: m.role,
        lastActive: m.jam.messages[0]?.createdAt.toISOString() ?? m.jam.createdAt.toISOString(),
        createdAt: m.jam.createdAt.toISOString(),
      })),
  });
});

// POST { name, desc?, type: 'PUBLIC'|'PRIVATE' } — create a music DJ set.
export const POST = handle(async (req) => {
  const me = await requireUser();
  const { name, desc, type } = (await req.json()) as { name?: string; desc?: string; type?: string };
  if (!name || name.trim().length < 2 || name.trim().length > 40) return err('Name must be 2–40 characters');
  const jtype = type === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC';

  const ownedCount = await prisma.jam.count({ where: { ownerId: me.id } });
  if (ownedCount >= 1) return err('You can only own one jam', 403);

  const id = `J${Date.now().toString(36)}${randomBytes(4).toString('hex').toUpperCase()}`;

  const jam = await prisma.jam.create({
    data: {
      id,
      name: name.trim(),
      desc: (desc ?? '').trim().slice(0, 120),
      type: jtype,
      kind: 'MUSIC',
      ownerId: me.id,
      members: { create: { userId: me.id, role: 'HOST' } },
    },
  });
  return json({ ok: true, jam: { id: jam.id, name: jam.name, desc: jam.desc, type: jam.type, kind: jam.kind } }, 201);
});