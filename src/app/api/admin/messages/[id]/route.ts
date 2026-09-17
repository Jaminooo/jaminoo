import { handle, json, err, requireAdmin } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { pushAdminEvent } from '@/lib/admin';

type Ctx = { params: { id: string } };

export const DELETE = handle(async (req, { params }: Ctx) => {
  await requireAdmin();
  const id = Number(params.id);
  if (!Number.isInteger(id)) return err('Bad request', 400);
  const body = (await req.json().catch(() => ({}))) as { kind?: string };
  if (body.kind === 'dm') {
    const msg = await prisma.dmMessage.findUnique({
      where: { id },
      select: { id: true, text: true, sender: { select: { username: true } } },
    });
    if (!msg) return err('Not found', 404);
    await prisma.dmMessage.delete({ where: { id } });
    pushAdminEvent('error', `DM from @${msg.sender.username} deleted`, { action: 'dm-delete', id });
    return json({ ok: true });
  }
  const msg = await prisma.jamMessage.findUnique({
    where: { id },
    select: { id: true, text: true, user: { select: { username: true } } },
  });
  if (!msg) return err('Not found', 404);
  await prisma.jamMessage.delete({ where: { id } });
  pushAdminEvent('error', `Jam msg from @${msg.user.username} deleted`, { action: 'msg-delete', id });
  return json({ ok: true });
});