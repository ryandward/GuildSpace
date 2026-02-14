export type Role = 'owner' | 'admin' | 'officer' | 'member';

/** Roles that get a visible badge. Member is implicit — no badge needed. */
export const BADGE_ROLES = ['owner', 'admin', 'officer'] as const;
export type BadgeRole = typeof BADGE_ROLES[number];

export function isBadgeRole(role: Role): role is BadgeRole {
  return role !== 'member';
}

export const ROLE_COLOR: Record<BadgeRole, 'accent' | 'red' | 'blue'> = {
  owner: 'accent',
  admin: 'red',
  officer: 'blue',
};

export const ROLE_LABEL: Record<BadgeRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  officer: 'Officer',
};

/** Get the "since" date for a role, if tracked. */
export function roleSince(role: Role, data: { officerSince?: string | null; adminSince?: string | null }): string | null {
  if (role === 'admin') return data.adminSince ?? null;
  if (role === 'officer') return data.officerSince ?? null;
  return null;
}
