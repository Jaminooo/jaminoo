import { handle, json, err } from '@/lib/api';
import { requireAnyAdmin, HUB_ADMIN_SCOPES } from '@/lib/roles';
import { prisma } from '@/lib/prisma';
import { pushAdminEvent } from '@/lib/admin';

function roleScopeValid(scope: string) {
  return scope === 'ALL' || HUB_ADMIN_SCOPES.includes(scope as any);
}

// GET /api/admin/roles — list hub roles for the super admin
export const GET = handle(async () => {
  const ctx = await requireAnyAdmin();
  if (!ctx.isSuper) return json({ roles: [], me: { username: ctx.user.username } });
  const roles = await prisma.adminRole.findMany({
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { id: true, username: true, email: true, isAdmin: true, createdAt: true } } },
  });
  return json({ roles: roles.map((r) => ({ id: r.id, userId: r.userId, username: r.user.username, email: r.user.email, isAdmin: r.user.isAdmin, createdAt: r.user.createdAt.toISOString(), role: r.role, scope: r.scope })), me: { username: ctx.user.username } });
});

// POST /api/admin/roles — { userId, role: 'SUPER' | 'HUB', scope } (super only)
export const POST = handle(async (req) => {
  const ctx = await requireAnyAdmin();
  if (!ctx.isSuper) return err('Only the super admin can grant roles', 403);
  const body = await req.json().catch(() => ({}));
  const userId = Number(body.userId);
  const role = String(body.role || 'HUB').toUpperCase();
  const scope = role === 'SUPER' ? '' : String(body.scope || '').toUpperCase();
  if (!Number.isInteger(userId) || userId <= 0) return err('Invalid user');
  if (role !== 'SUPER' && role !== 'HUB') return err('Invalid role');
  if (role === 'HUB' && !roleScopeValid(scope)) return err('Invalid scope');
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, username: true } });
  if (!user) return err('User not found', 404);
  const existing = await prisma.adminRole.findUnique({ where: { userId } });
  let record;
  if (existing) {
    record = await prisma.adminRole.update({ where: { userId }, data: { role, scope } });
  } else {
    record = await prisma.adminRole.create({ data: { userId, role, scope } });
  }
  pushAdminEvent('roles', `${role === 'SUPER' ? 'Super admin' : `Hub admin (${scope})`} granted to ${user.username}`);
  return json({ role: { id: record.id, userId: record.userId, role: record.role, scope: record.scope } }, 201);
});

// DELETE /api/admin/roles?userId= — revoke a hub role (super only)
export const DELETE = handle(async (req) => {
  const ctx = await requireAnyAdmin();
  if (!ctx.isSuper) return err('Only the super admin can revoke roles', 403);
  const userId = Number(new URL(req.url).searchParams.get('userId'));
  if (!Number.isInteger(userId) || userId <= 0) return err('Invalid user');
  const existing = await prisma.adminRole.findUnique({ where: { userId } });
  if (!existing) return err('No role to revoke', 404);
  // never allow revoking the super admin's super role
  if (existing.role === 'SUPER') {
    const me = await prisma.user.findUnique({ where: { username: ctx.user.username }, select: { id: true } });
    if (me?.id === userId) return err('You cannot revoke your own super admin role');
  }
  await prisma.adminRole.delete({ where: { userId } });
  pushAdminEvent('roles', `Role revoked for user id ${userId}`);
  return json({ ok: true });
});
