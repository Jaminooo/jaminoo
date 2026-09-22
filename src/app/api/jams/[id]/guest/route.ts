import { handle, json, err } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { createGuestSession, getCurrentSessionContext } from '@/lib/session';
import { livePublish } from '@/lib/live-publish';
import { JAM_KIND_MUSIC, JAM_MAX_MEMBERS, JAM_GUEST_HOURS } from '@/lib/constants';
import { randomBytes } from 'crypto';

type Ctx = { params: { id: string } };

// POST /api/jams/[id]/guest  { name } — join a public jam as an anonymous guest.
// Guests are lightweight synthetic users (isGuest) confined to jam features:
// requireUser() rejects them everywhere except routes that opt in via allowGuest.
export const POST = handle(async (req, { params }: Ctx) => {
  const ctx = await getCurrentSessionContext();
  const jam = await prisma.jam.findUnique({ where: { id: params.id }, select: { id: true, closed: true, type: true } });
  if (!jam || jam.closed) return err('Jam not found', 404);

  const memberCount = await prisma.jamMember.count({ where: { jamId: jam.id } });
  if (memberCount >= JAM_MAX_MEMBERS) return err('This jam is full', 403);

  if (ctx && !ctx.user.isGuest) {
    await prisma.jamMember.upsert({
      where: { jamId_userId: { jamId: jam.id, userId: ctx.user.id } },
      update: {},
      create: { jamId: jam.id, userId: ctx.user.id },
    });
    livePublish(`jam:${jam.id}`, 'jam:update', jam.id);
    return json({ ok: true, roomId: jam.id, user: { id: ctx.user.id, username: ctx.user.username } });
  }

  if (jam.type === 'PRIVATE') return err('This jam is private — sign in to join', 403);

  const { name } = (await req.json()) as { name?: string };
  const clean = (name ?? '').trim().slice(0, 20);
  if (clean.length < 2) return err('Guest name must be 2–20 characters');

  if (ctx && ctx.user.isGuest) {
    const existingMember = await prisma.jamMember.findUnique({ where: { jamId_userId: { jamId: jam.id, userId: ctx.user.id } } });
    if (existingMember) {
      return json({ ok: true, roomId: jam.id, user: { id: ctx.user.id, username: ctx.user.username } });
    }
  }

  const username = `guest_${randomBytes(6).toString('hex')}`;
  const user = await prisma.user.create({
    data: {
      username,
      name: clean,
      avatarId: Math.floor(Math.random() * 16) + 1,
      isGuest: true,
      guestUntil: new Date(Date.now() + JAM_GUEST_HOURS * 60 * 60 * 1000),
    },
  });

  await createGuestSession(user.id);
  await prisma.jamMember.create({ data: { jamId: jam.id, userId: user.id, role: 'MEMBER' } });
  livePublish(`jam:${jam.id}`, 'jam:update', jam.id);

  return json({ ok: true, roomId: jam.id, user: { id: user.id, username: user.username } });
});

// GET /api/jams/[id]/guest — preview state for a guest arriving via invite link.
export const GET = handle(async (_req, { params }: Ctx) => {
  const ctx = await getCurrentSessionContext();
  if (!ctx) return err('Not signed in', 401);
  const jam = await prisma.jam.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, desc: true, type: true, kind: true, closed: true, ownerId: true },
  });
  if (!jam) return err('Jam not found', 404);
  return json({
    jam: {
      id: jam.id,
      name: jam.name,
      desc: jam.desc,
      type: jam.type,
      kind: jam.kind,
      closed: jam.closed,
      ownerId: jam.ownerId,
      isMusic: jam.kind === JAM_KIND_MUSIC,
    },
  });
});