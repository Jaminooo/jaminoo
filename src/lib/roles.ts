import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import { UnauthorizedError, forbidden } from '@/lib/api';
import { ensureAdmins } from '@/lib/admin';

export { HUB_ADMIN_SCOPES, parseRoleScope, classifyAdmin } from '@/lib/roles-shared';
export type { HubScope, AdminClass, AdminContext } from '@/lib/roles-shared';
import { classifyAdmin } from '@/lib/roles-shared';
import type { HubScope, AdminContext } from '@/lib/roles-shared';

export async function loadAdminRole(userId: number) {
  return prisma.adminRole.findUnique({ where: { userId }, select: { role: true, scope: true } });
}

export async function requireAnyAdmin(): Promise<AdminContext> {
  await ensureAdmins();
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  const role = await loadAdminRole(user.id);
  const scope = classifyAdmin(user, role);
  if (!scope) throw forbidden('Admin only');
  return {
    user: { id: user.id, username: user.username, email: user.email, isAdmin: user.isAdmin },
    role,
    scope,
    isSuper: scope === 'super' || scope === 'legacy',
  };
}

export async function requireHubAdmin(scope: HubScope): Promise<AdminContext> {
  const ctx = await requireAnyAdmin();
  if (!ctx.isSuper && ctx.scope !== `hub:${scope}`) throw forbidden('Not authorized for this admin section');
  return ctx;
}

export const isSuper = (ctx: AdminContext) => ctx.isSuper;

export async function isSuperAdminRoute() {
  const me = await getCurrentUser();
  if (!me) return false;
  const role = await loadAdminRole(me.id);
  return role?.role === 'SUPER';
}
