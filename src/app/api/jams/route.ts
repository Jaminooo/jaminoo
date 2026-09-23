import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { jamCardPayload } from '@/lib/jam-card';
import { normalizeJamKind } from '@/lib/jam-kind';
import { rateLimitByUser } from '@/lib/rate-limit';
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
      .filter((m) => !m.jam.closed)
      .map((m) => ({
        ...jamCardPayload(m.jam, me.id),
        role: m.role,
        lastActive: m.jam.messages[0]?.createdAt.toISOString() ?? m.jam.createdAt.toISOString(),
        createdAt: m.jam.createdAt.toISOString(),
      })),
  });
});

// POST { name, desc?, type: 'PUBLIC'|'PRIVATE', kind?: 'MUSIC'|'MOVIE'|'ANIME' }
// Create a fresh room: a DJ set (music), a cinema party or an anime party.
export const POST = handle(async (req) => {
  const me = await requireUser();
  const { name, desc, type, kind } = (await req.json()) as {
    name?: string;
    desc?: string;
    type?: string;
    kind?: unknown;
  };
  if (!name || name.trim().length < 2 || name.trim().length > 40) return err('Name must be 2–40 characters');
  rateLimitByUser(req, me.id, 10, 60 * 1000);
  const jtype = type === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC';
  const jkind = normalizeJamKind(kind);

  // One owned room per kind: a music DJ set, a cinema party and an anime party can coexist.
  const ownedCount = await prisma.jam.count({ where: { ownerId: me.id, kind: jkind } });
  if (ownedCount >= 1) return err(`You already own a ${jkind.toLowerCase()} room — leave or close it before starting another`);

  const jam = await prisma.jam.create({
    data: {
      id: randomBytes(5).toString('hex'),
      name: name.trim(),
      desc: (desc || '').trim().slice(0, 300),
      type: jtype,
      kind: jkind,
      ownerId: me.id,
    },
  });
  await prisma.jamMember.create({ data: { jamId: jam.id, userId: me.id, role: 'OWNER' } });
  return json({ ok: true, jam: { id: jam.id, name: jam.name, desc: jam.desc, type: jam.type, kind: jam.kind } }, 201);
});