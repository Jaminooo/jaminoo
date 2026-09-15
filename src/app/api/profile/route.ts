import { handle, json, err, requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';

export const GET = handle(async () => {
  const user = await requireUser();
  return json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      avatarId: user.avatarId,
      bio: user.bio,
      github: user.github,
      questionVerbose: user.questionId != null,
      createdAt: user.createdAt.toISOString(),
    },
  });
});

export const PATCH = handle(async (req) => {
  const me = await requireUser();
  const { username, email, bio } = (await req.json()) as { username?: string; email?: string; bio?: string };

  if (username != null) {
    const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;
    if (!USERNAME_RE.test(username)) return err('Invalid username');
    const taken = await prisma.user.findUnique({ where: { username } });
    if (taken && taken.id !== me.id) return err('Username taken', 409);
  }
  if (email != null && email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return err('Invalid email');
  }

  const updated = await prisma.user.update({
    where: { id: me.id },
    data: {
      username: username ?? me.username,
      email: email != null ? email.trim() : me.email,
      bio: bio != null ? (bio as string).slice(0, 160) : me.bio,
    },
  });
  return json({ ok: true, user: { ...me, ...updated } });
});