import { handle, json, err } from '@/lib/api';
import { createSession, parseUserAgent } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { SECURITY_QUESTIONS, uidDisplay } from '@/lib/constants';
import bcrypt from 'bcryptjs';

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

export const POST = handle(async (req) => {
  const { username, email, password, questionId, answer } = (await req.json()) as {
    username?: string;
    email?: string;
    password?: string;
    questionId?: number;
    answer?: string;
  };

  if (!username || !USERNAME_RE.test(username)) return err('Invalid username');
  if (!password || password.length < 6) return err('Password too short');
  if (questionId == null || !SECURITY_QUESTIONS[questionId]) return err('Pick a security question');
  if (!answer || !answer.trim()) return err('Provide an answer');

  const taken = await prisma.user.findUnique({ where: { username } });
  if (taken) return err('Username taken', 409);

  const passwordHash = await bcrypt.hash(password, 10);
  const answerHash = await bcrypt.hash(answer.trim().toLowerCase(), 10);
  const avatarId = Math.floor(Math.random() * 12);

  const user = await prisma.user.create({
    data: {
      username,
      email: email?.trim() ?? '',
      passwordHash,
      questionId,
      answerHash,
      avatarId,
      bio: '',
    },
  });

  await createSession(user.id, parseUserAgent(req.headers.get('user-agent')));
  return json({ ok: true, id: user.id, uid: uidDisplay(user.id) }, 201);
});