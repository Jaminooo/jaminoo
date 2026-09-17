import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';

export const POST = handle(async (req) => {
  const me = await requireUser();
  const body = await req.json().catch(() => ({}));
  const jamMessageId = body.jamMessageId == null ? null : Number(body.jamMessageId);
  const dmMessageId = body.dmMessageId == null ? null : Number(body.dmMessageId);
  const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 300) : '';
  if (!reason || (jamMessageId == null && dmMessageId == null) || (jamMessageId != null && dmMessageId != null)) return err('Invalid report');
  if (jamMessageId != null && !Number.isInteger(jamMessageId)) return err('Invalid message');
  if (dmMessageId != null && !Number.isInteger(dmMessageId)) return err('Invalid message');
  const report = await prisma.messageReport.create({ data: { reporterId: me.id, jamMessageId, dmMessageId, reason } });
  return json({ report: { id: report.id, status: report.status } }, 201);
});
