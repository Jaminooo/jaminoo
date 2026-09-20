import { handle, json, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';

export const PATCH = handle(async (_req, { params }: { params: { id: string } }) => {
  const me = await requireUser();
  const id = Number(params.id);
  const row = await prisma.scheduledTweet.findUnique({ where: { id } });
  if (!row || row.userId !== me.id) return json({ error: 'Scheduled tweet not found' }, 404);
  if (row.status !== 'PENDING') return json({ error: 'Only pending tweets can be canceled' }, 400);

  await prisma.scheduledTweet.update({
    where: { id },
    data: { status: 'CANCELED' },
  });
  return json({ ok: true });
});

export const DELETE = handle(async (_req, { params }: { params: { id: string } }) => {
  const me = await requireUser();
  const id = Number(params.id);
  const row = await prisma.scheduledTweet.findUnique({ where: { id } });
  if (!row || row.userId !== me.id) return json({ error: 'Scheduled tweet not found' }, 404);

  await prisma.scheduledTweet.delete({ where: { id } });
  return json({ ok: true });
});