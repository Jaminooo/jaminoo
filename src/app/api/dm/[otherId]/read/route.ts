import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { livePublish } from '@/lib/live-publish';
import { getOrCreateConvo, areFriends } from '@/lib/dm';

type Ctx = { params: { otherId: string } };

// POST /api/dm/[otherId]/read — mark messages from otherId as seen
export const POST = handle(async (_req, { params }: Ctx) => {
  const me = await requireUser();
  const otherId = Number(params.otherId);
  if (!Number.isFinite(otherId) || otherId === me.id) return err('Invalid user');
  if (!(await areFriends(me.id, otherId))) return err('Not friends', 403);

  const conv = await getOrCreateConvo(me.id, otherId);
  await prisma.dmMessage.updateMany({
    where: { convId: conv.id, senderId: otherId, seenAt: null },
    data: { seenAt: new Date() },
  });

  livePublish(`user:${otherId}`, 'dm:seen', { by: me.id, convId: conv.id });
  return json({ ok: true });
});
