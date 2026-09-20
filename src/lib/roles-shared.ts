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