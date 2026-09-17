import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';

const userSelect = { id: true, username: true, avatarId: true, profilePhotoId: true } as const;

export const GET = handle(async () => {
  const me = await requireUser();
  const [received, sent] = await Promise.all([
    prisma.videoCollabInvite.findMany({ where: { toId: me.id }, orderBy: { createdAt: 'desc' }, take: 40, include: { post: { select: { id: true, title: true, kind: true } }, from: { select: userSelect }, to: { select: userSelect } } }),
    prisma.videoCollabInvite.findMany({ where: { fromId: me.id }, orderBy: { createdAt: 'desc' }, take: 40, include: { post: { select: { id: true, title: true, kind: true } }, from: { select: userSelect }, to: { select: userSelect } } }),
  ]);
  return json({ received, sent });
});

export const POST = handle(async (req) => {
  const me = await requireUser();
  const body = await req.json().catch(() => ({}));
  const postId = Number(body.postId);
  const toUserId = Number(body.toUserId);
  const message = typeof body.message === 'string' ? body.message.trim().slice(0, 240) : '';
  if (!Number.isInteger(postId) || !Number.isInteger(toUserId) || postId <= 0 || toUserId <= 0 || toUserId === me.id) return err('Invalid collaboration target');
  const post = await prisma.videoPost.findUnique({ where: { id: postId }, select: { id: true, title: true, authorId: true, kind: true } });
  if (!post || post.authorId !== me.id) return err('Only the post owner can invite collaborators', 403);
  const target = await prisma.user.findUnique({ where: { id: toUserId }, select: userSelect });
  if (!target) return err('User not found', 404);
  const existing = await prisma.videoCollabInvite.findUnique({ where: { postId_toId: { postId, toId: toUserId } } });
  if (existing?.status === 'PENDING') return err('This collaborator already has a pending invite');
  const invite = existing
    ? await prisma.videoCollabInvite.update({ where: { id: existing.id }, data: { fromId: me.id, status: 'PENDING', message }, include: { post: { select: { id: true, title: true, kind: true } }, from: { select: userSelect }, to: { select: userSelect } } })
    : await prisma.videoCollabInvite.create({ data: { postId, fromId: me.id, toId: toUserId, message }, include: { post: { select: { id: true, title: true, kind: true } }, from: { select: userSelect }, to: { select: userSelect } } });
  await prisma.notification.create({ data: { userId: toUserId, kind: 'VIDEO_COLLAB', payload: JSON.stringify({ inviteId: invite.id, postId, title: post.title, kind: post.kind, fromId: me.id, username: me.username }) } });
  return json({ invite }, 201);
});

export const PATCH = handle(async (req) => {
  const me = await requireUser();
  const body = await req.json().catch(() => ({}));
  const inviteId = Number(body.inviteId);
  const action = body.action === 'accept' ? 'ACCEPTED' : body.action === 'decline' ? 'DECLINED' : '';
  if (!Number.isInteger(inviteId) || !action) return err('Invalid collaboration action');
  const invite = await prisma.videoCollabInvite.findUnique({ where: { id: inviteId }, include: { post: { select: { id: true, title: true } } } });
  if (!invite || invite.toId !== me.id) return err('Invite not found', 404);
  const updated = await prisma.videoCollabInvite.update({ where: { id: inviteId }, data: { status: action } });
  await prisma.notification.create({ data: { userId: invite.fromId, kind: 'VIDEO_COLLAB_RESPONSE', payload: JSON.stringify({ inviteId, postId: invite.postId, title: invite.post.title, status: action, userId: me.id, username: me.username }) } });
  return json({ invite: updated });
});
