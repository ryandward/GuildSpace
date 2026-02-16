import { getClassColor } from '../lib/classColors';
import { isBadgeRole, roleSince, ROLE_LABEL } from '../lib/roles';
import type { Role, BadgeRole } from '../lib/roles';

interface Props {
  name: string;
  classColor?: string | null;
  role: Role;
  hasGuildSpace: boolean;
  isOnline?: boolean;
  /** Icon size — 'sm' for compact rows, 'md' for profile headers */
  iconSize?: 'sm' | 'md';
  /** Role "since" dates for tooltip (detail page only) */
  officerSince?: string | null;
  adminSince?: string | null;
  className?: string;
}

function formatSince(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const COLOR_CLASS: Record<BadgeRole, string> = {
  owner: 'text-accent',
  admin: 'text-red',
  officer: 'text-blue',
};

interface IconProps { className?: string; title?: string }

function CrownIcon({ className, title }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" role="img">
      {title && <title>{title}</title>}
      <path d="M2.5 12.5h11v1.5h-11zM1 5.5l3 3 4-5 4 5 3-3-1.5 6h-11z" />
    </svg>
  );
}

function StarIcon({ className, title }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" role="img">
      {title && <title>{title}</title>}
      <path d="M8 1l2.2 4.4 4.8.7-3.5 3.4.8 4.8L8 12l-4.3 2.3.8-4.8L1 6.1l4.8-.7z" />
    </svg>
  );
}

function ShieldIcon({ className, title }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" role="img">
      {title && <title>{title}</title>}
      <path d="M8 1L2 3.5v4c0 3.5 2.6 6.4 6 7.5 3.4-1.1 6-4 6-7.5v-4z" />
    </svg>
  );
}

const ROLE_ICON: Record<BadgeRole, typeof CrownIcon> = {
  owner: CrownIcon,
  admin: StarIcon,
  officer: ShieldIcon,
};

/**
 * Standard member name display: dot · name [icon]
 *
 * Dot: green (online), yellow/accent (GuildSpace member), none (never joined).
 * Icon: Owner (crown), Admin (star), Officer (shield) — members get no icon.
 */
export default function MemberName({ name, classColor, role, hasGuildSpace, isOnline, iconSize = 'sm', officerSince, adminSince, className }: Props) {
  const since = isBadgeRole(role) ? roleSince(role, { officerSince, adminSince }) : null;
  const sizeClass = iconSize === 'md' ? 'size-2' : 'size-1.5';

  return (
    <span
      className={className ?? 'font-body text-body font-semibold truncate inline-flex items-center gap-1'}
      style={classColor ? { color: getClassColor(classColor) } : undefined}
    >
      {isOnline
        ? <span className="inline-block size-1 rounded-full bg-green shrink-0" title="Online" />
        : hasGuildSpace
          ? <span className="inline-block size-1 rounded-full bg-text-dim shrink-0" title="GuildSpace member" />
          : <span className="inline-block size-1 rounded-full shrink-0" />}
      {name}
      {isBadgeRole(role) && (() => {
        const Icon = ROLE_ICON[role];
        const label = ROLE_LABEL[role];
        const title = since ? `${label} since ${formatSince(since)}` : label;
        return (
          <Icon
            className={`${sizeClass} ${COLOR_CLASS[role]} shrink-0`}
            title={title}
          />
        );
      })()}
    </span>
  );
}
