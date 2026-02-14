export type Role = 'owner' | 'admin' | 'officer';

export const ROLE_COLOR = {
  owner: 'accent',
  admin: 'red',
  officer: 'blue',
} as const;

export const ROLE_LABEL = {
  owner: 'Owner',
  admin: 'Admin',
  officer: 'Officer',
} as const;

/** Pick the highest role from a set of booleans. Owner > Admin > Officer. */
export function highestRole(flags: { isOwner: boolean; isAdmin: boolean; isOfficer: boolean }): Role | null {
  if (flags.isOwner) return 'owner';
  if (flags.isAdmin) return 'admin';
  if (flags.isOfficer) return 'officer';
  return null;
}
