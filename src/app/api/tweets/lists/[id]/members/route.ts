import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';

async function assertOwner(listId: number, userId: number) {
  const list = await prisma.tweetList.findUnique({ where: { id: listId }, select: { id: true, ownerId: true } });
  if (!list) return 'LIST_NOT_FOUND';
  if (list.ownerId !== userId) return 'FORBIDDEN';
  return null;
}

export const POST = handle(async (req, { params }) => {
  const me = await requireUser();
  const id = Number(params.id);
  const guard = await assertOwner(id, me.id);
  if (guard === 'LIST_NOT_FOUND') return err('List not found', 404);
  if (guard === 'FORBIDDEN') return err('Only the list owner can manage members', 403);

  const body = await req.json().catch(() => ({}));
  let memberId = Number(body.userId);
  if (!memberId) {
    const username = typeof body.username === 'string' ? body.username.trim().replace(/^@/, '') : '';
    if (!username) return err('Provide a userId or username');
    const user = await prisma.user.findUnique({ where: { username }, select: { id: true } });
    if (!user) return err('That user does not exist', 404);
    memberId = user.id;
  }

  await prisma.tweetListMember.upsert({
    where: { listId_memberId: { listId: id, memberId } },
    update: {},
    create: { listId: id, memberId },
  });
  return json({ ok: true });
});

export const DELETE = handle(async (req, { params }) => {
  const me = await requireUser();
  const id = Number(params.id);
  const guard = await assertOwner(id, me.id);
  if (guard === 'LIST_NOT_FOUND') return err('List not found', 404);
  if (guard === 'FORBIDDEN') return err('Only the list owner can manage members', 403);

  const memberId = Number(new URL(req.url).searchParams.get('userId'));
  if (!memberId) return err('Provide a userId');
  await prisma.tweetListMember.deleteMany({ where: { listId: id, memberId } });
  return json({ ok: true });
});