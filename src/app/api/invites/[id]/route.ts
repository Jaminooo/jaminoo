import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { livePublish } from '@/lib/live-publish';

type Ctx = { params: { id: string } };

// POST /api/invites/[id]  { action: 'accept' | 'decline' }
export const POST = handle(async (req, { params }: Ctx) => {
  const me = await requireUser();
  const id = Number(params.id);
  const { action } = (await req.json()) as { action?: string };
  if (!Number.isInteger(id)) return err('Bad request');
  if (action !== 'accept' && action !== 'decline') return err('Invalid action');

  const invite = await prisma.jamInvite.findUnique({
    where: { id },
    include: { jam: { include: { members: true } } },
  });
  if (!invite) return err('Invite not found', 404);
  if (invite.toId !== me.id) return err('Forbidden', 403);
  if (invite.status !== 'PENDING') return err('Invite already handled', 409);

  if (action === 'accept') {
    if (invite.jam.closed) return err('This jam is closed', 403);
    await prisma.jamMember.upsert({
      where: { jamId_userId: { jamId: invite.jamId, userId: me.id } },
      update: {},
      create: { jamId: invite.jamId, userId: me.id },
    });
    await prisma.jamInvite.update({ where: { id }, data: { status: 'ACCEPTED' } });
    livePublish([`jam:${invite.jamId}`, `user:${me.id}`, `user:${invite.fromId}`], 'jam:update', invite.jamId);
  } else {
    await prisma.jamInvite.update({ where: { id }, data: { status: 'DECLINED' } });
  }
  return json({ ok: true });
});