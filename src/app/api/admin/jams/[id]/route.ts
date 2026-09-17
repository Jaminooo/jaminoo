import { handle, json, err, requireAdmin } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { pushAdminEvent } from '@/lib/admin';

type Ctx = { params: { id: string } };

export const PATCH = handle(async (req, { params }: Ctx) => {
  await requireAdmin();
  const id = params.id;
  const jam = await prisma.jam.findUnique({
    where: { id },
    select: { id: true, name: true, closed: true },
  });
  if (!jam) return err('Not found', 404);
  const body = (await req.json()) as { closed?: boolean };
  const next = body.closed === undefined ? !jam.closed : !!body.closed;
  await prisma.jam.update({ where: { id }, data: { closed: next } });
  pushAdminEvent(next ? 'warn' : 'ok', `${key(jam.name)} ${next ? 'closed' : 'reopened'}`, {
    action: next ? 'close' : 'open',
    jam: id,
  });
  return json({ ok: true, closed: next });
});

export const DELETE = handle(async (_req, { params }: Ctx) => {
  await requireAdmin();
  const id = params.id;
  const jam = await prisma.jam.findUnique({ where: { id }, select: { id: true, name: true } });
  if (!jam) return err('Not found', 404);
  await prisma.jam.delete({ where: { id } });
  pushAdminEvent('error', `Jam ${key(jam.name)} deleted`, { action: 'jam-delete', jam: id });
  return json({ ok: true });
});

function key(n: string) {
  return n.length > 24 ? n.slice(0, 24) + '…' : n;
}