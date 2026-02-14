import { Badge } from '../ui';
import { getClassColor } from '../lib/classColors';
import { isBadgeRole, roleSince, ROLE_COLOR, ROLE_LABEL } from '../lib/roles';
import type { Role } from '../lib/roles';

interface Props {
  name: string;
  classColor?: string | null;
  role: Role;
  hasGuildSpace: boolean;
  isOnline?: boolean;
  /** Badge variant — 'count' for compact rows, 'status' for profile headers */
  badgeVariant?: 'count' | 'status';
  /** Role "since" dates for tooltip (detail page only) */
  officerSince?: string | null;
  adminSince?: string | null;
  className?: string;
}

function formatSince(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Standard member name display: dot · name [badge]
 *
 * Dot: green (online), yellow/accent (GuildSpace member), none (never joined).
 * Badge: Officer/Admin/Owner — members get no badge.
 */
export default function MemberName({ name, classColor, role, hasGuildSpace, isOnline, badgeVariant = 'count', officerSince, adminSince, className }: Props) {
  const since = isBadgeRole(role) ? roleSince(role, { officerSince, adminSince }) : null;

  return (
    <span
      className={className ?? 'font-body text-body font-semibold truncate inline-flex items-center gap-1'}
      style={classColor ? { color: getClassColor(classColor) } : undefined}
    >
      {isOnline
        ? <span className="inline-block size-1 rounded-full bg-green shrink-0" title="Online" />
        : hasGuildSpace
          ? <span className="inline-block size-1 rounded-full bg-accent shrink-0" title="GuildSpace member" />
          : <span className="inline-block size-1 rounded-full shrink-0" />}
      {name}
      {isBadgeRole(role) && (
        <Badge
          variant={badgeVariant}
          color={ROLE_COLOR[role]}
          title={since ? `Since ${formatSince(since)}` : undefined}
        >
          {ROLE_LABEL[role]}
        </Badge>
      )}
    </span>
  );
}
