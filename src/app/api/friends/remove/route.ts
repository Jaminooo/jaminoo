import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { livePublish } from '@/lib/live-publish';

// POST { friendId } — removes the friendship between me and friendId
export const POST = handle(async (req) => {
  const me = await requireUser();
  const { friendId } = (await req.json()) as { friendId?: number };
  if (!friendId) return err('Bad request');

  const existing = await prisma.friendRequest.findFirst({
    where: { status: 'FRIENDS', OR: [{ fromId: me.id, toId: friendId }, { fromId: friendId, toId: me.id }] },
  });
  if (!existing) return err('Not friends', 404);

  await prisma.friendRequest.delete({ where: { id: existing.id } });
  livePublish([`user:${me.id}`, `user:${friendId}`], 'friends:update', { at: Date.now() });
  return json({ ok: true });
});