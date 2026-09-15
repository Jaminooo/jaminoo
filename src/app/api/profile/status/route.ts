import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { liveBroadcast } from '@/lib/live-publish';

const STATUSES = ['ONLINE', 'IDLE', 'BUSY', 'OFFLINE'];

export const PATCH = handle(async (req) => {
  const me = await requireUser();
  const { status, statusText } = (await req.json()) as { status?: string; statusText?: string };

  if (status != null && !STATUSES.includes(status)) return err('Invalid status');
  const updated = await prisma.user.update({
    where: { id: me.id },
    data: {
      status: status ?? me.status,
      statusText: statusText != null ? (statusText as string).slice(0, 80) : me.statusText,
    },
  });
  liveBroadcast('status:update', { userId: me.id, status: updated.status, statusText: updated.statusText });
  return json({
    ok: true,
    user: { id: updated.id, status: updated.status, statusText: updated.statusText },
  });
});