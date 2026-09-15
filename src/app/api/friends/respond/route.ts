import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';

// POST { requestId, action: 'accept' | 'decline' | 'cancel' }
export const POST = handle(async (req) => {
  const me = await requireUser();
  const { requestId, action } = (await req.json()) as { requestId?: number; action?: string };

  if (!requestId || !['accept', 'decline', 'cancel'].includes(action || '')) return err('Bad request');

  const fr = await prisma.friendRequest.findUnique({ where: { id: requestId } });
  if (!fr) return err('Request not found', 404);

  if (action === 'accept') {
    if (fr.toId !== me.id) return err('Forbidden', 403);
    await prisma.friendRequest.update({ where: { id: fr.id }, data: { status: 'FRIENDS' } });
    return json({ ok: true });
  }
  if (action === 'decline') {
    if (fr.toId !== me.id) return err('Forbidden', 403);
    await prisma.friendRequest.delete({ where: { id: fr.id } });
    return json({ ok: true });
  }
  // cancel own outgoing
  if (fr.fromId !== me.id) return err('Forbidden', 403);
  await prisma.friendRequest.delete({ where: { id: fr.id } });
  return json({ ok: true });
});