import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getCurrentSessionToken } from '@/lib/session';
import bcrypt from 'bcryptjs';

export const PATCH = handle(async (req) => {
  const me = await requireUser();
  if (me.github) return err('GitHub accounts do not use passwords.', 400);
  const { currentPassword, newPassword } = (await req.json()) as { currentPassword?: string; newPassword?: string };
  if (!currentPassword || !newPassword) return err('Missing fields');
  if (newPassword.length < 8) return err('Password must be at least 8 characters');
  if (!me.passwordHash) return err('No password set', 400);
  const match = await bcrypt.compare(currentPassword, me.passwordHash);
  if (!match) return err('Current password is wrong', 401);
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: me.id }, data: { passwordHash } });
  const current = await getCurrentSessionToken();
  await prisma.session.deleteMany({ where: { userId: me.id, token: current ? { not: current } : undefined } });
  return json({ ok: true });
});