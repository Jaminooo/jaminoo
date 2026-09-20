import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import { UnauthorizedError, forbidden } from '@/lib/api';
import { ensureAdmins, ROOT } from '@/lib/admin';

export const HUB_ADMIN_SCOPES = ['MUSIC', 'VIDEO', 'ANIME', 'CINEMA', 'TWEET', 'COMMUNITY'] as const;
export type HubScope = (typeof HUB_ADMIN_SCOPES)[number];

export type AdminClass =
  | 'super'
  | 'legacy'
  | `hub:${HubScope}`;

export interface AdminContext {
  user: { id: number; username: string; email: string; isAdmin: boolean };
  role: { role: string; scope: string } | null;
  scope: AdminClass;
  isSuper: boolean;
}

export function parseRoleScope(value: string | undefined): HubScope | null {
  const v = (value ?? '').toUpperCase();
  return HUB_ADMIN_SCOPES.includes(v as HubScope) ? (v as HubScope) : null;
}

export function classifyAdmin(
  user: { id: number; username: string; isAdmin: boolean } | null,
  role: { role: string; scope: string } | null
): AdminClass | null {
  if (!user) return null;
  if (role && role.role === 'SUPER') return 'super';
  if (user.isAdmin) return 'legacy';
  if (role && role.role === 'HUB' && parseRoleScope(role.scope)) return `hub:${role.scope as HubScope}`;
  return null;
}

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

export const SUPER_ADMIN = {
  username: ROOT.key,
  secret: ROOT.secret,
};

export async function isSuperAdminRoute() {
  const me = await getCurrentUser();
  if (!me) return false;
  const role = await loadAdminRole(me.id);
  return role?.role === 'SUPER';
}
