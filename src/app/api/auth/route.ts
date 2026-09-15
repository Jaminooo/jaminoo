import { handle, json, err } from '@/lib/api';
import { getCurrentUser, createSession, destroySession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { SECURITY_QUESTIONS } from '@/lib/constants';
import bcrypt from 'bcryptjs';

export const GET = handle(async () => {
  const user = await getCurrentUser();
  if (!user) return err('Not signed in', 401);
  return json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      avatarId: user.avatarId,
      bio: user.bio,
      github: user.github,
      createdAt: user.createdAt.toISOString(),
    },
  });
});

export const POST = handle(async (req) => {
  const { action, ...body } = await req.json();

  if (action === 'logout') {
    await destroySession();
    return json({ ok: true });
  }

  if (action === 'login') {
    const { username, password } = body as { username?: string; password?: string };
    if (!username || !password) return err('Missing username or password');
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || user.github) return err('Invalid username or password', 401);
    const match = user.passwordHash ? await bcrypt.compare(password, user.passwordHash) : false;
    if (!match) return err('Invalid username or password', 401);
    await createSession(user.id);
    return json({ ok: true });
  }

  if (action === 'forgot-question') {
    const { username } = body as { username?: string };
    if (!username) return err('Missing username');
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || user.github) return err('No such account', 404);
    if (user.questionId == null) return err('No security question set', 400);
    return json({
      username: user.username,
      question: SECURITY_QUESTIONS[user.questionId] ?? 'Security question',
    });
  }

  if (action === 'forgot-reset') {
    const { username, answer, newPassword } = body as { username?: string; answer?: string; newPassword?: string };
    if (!username || !answer || !newPassword) return err('Missing fields');
    if (newPassword.length < 6) return err('Password must be at least 6 characters');
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || user.github) return err('No such account', 404);
    if (!user.answerHash) return err('No security question set', 400);
    const match = await bcrypt.compare(answer.toLowerCase(), user.answerHash);
    if (!match) return err('Wrong answer', 401);
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    await createSession(user.id);
    return json({ ok: true });
  }

  return err('Unknown action');
});