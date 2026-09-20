import { handle, json, err } from '@/lib/api';
import { getCurrentUser, createSession, destroySession, parseUserAgent } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { classifyAdmin, loadAdminRole } from '@/lib/roles';

const SUPER_USERNAME = process.env.SUPER_ADMIN_USERNAME?.trim();
const SUPER_PASSWORD = process.env.SUPER_ADMIN_PASSWORD;

function sessionMetaFrom(req: Request) {
  const meta = parseUserAgent(req.headers.get('user-agent'));
  const country = (req.headers.get('cf-ipcountry') ?? '').toUpperCase().slice(0, 2);
  return { ...meta, country };
}

// GET /api/super-login — current super session status
export const GET = handle(async () => {
  const user = await getCurrentUser();
  if (!user) return json({ loggedIn: false });
  const role = await loadAdminRole(user.id);
  const scope = classifyAdmin(user, role);
  return json({ loggedIn: scope === 'super', username: user.username });
});

// POST /api/super-login — { action: 'login' | 'logout', username?, password? }
export const POST = handle(async (req) => {
  const { action, username, password } = (await req.json().catch(() => ({}))) as {
    action?: string;
    username?: string;
    password?: string;
  };

  if (action === 'logout') {
    await destroySession();
    return json({ ok: true });
  }

  if (action === 'login') {
    if (!SUPER_USERNAME || !SUPER_PASSWORD) return err('Super admin is not configured', 503);
    if (username !== SUPER_USERNAME || password !== SUPER_PASSWORD) return err('Invalid super admin credentials', 401);
    let user = await prisma.user.findUnique({ where: { username: SUPER_USERNAME } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          username: SUPER_USERNAME,
          email: '',
          avatarId: 0,
          name: 'Super Admin',
        },
      });
    }
    if (!user.isAdmin) await prisma.user.update({ where: { id: user.id }, data: { isAdmin: true } });
    await prisma.adminRole.upsert({
      where: { userId: user.id },
      update: { role: 'SUPER', scope: '' },
      create: { userId: user.id, role: 'SUPER', scope: '' },
    });
    await createSession(user.id, await sessionMetaFrom(req));
    return json({ ok: true, username: user.username });
  }

  return err('Unknown action');
});
