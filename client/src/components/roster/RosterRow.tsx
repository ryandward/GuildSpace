import { useNavigate } from 'react-router-dom';
import { Text } from '../../ui';
import { text } from '../../ui/recipes';
import { cx } from 'class-variance-authority';
import { getClassShort } from '../../lib/classColors';
import { timeAgo } from '../../utils/timeAgo';
import MemberName from '../MemberName';

// Desktop: name(1fr) | class(120) | lvl(32) | DKP(56) | lastRaid(72) | arrow(48)
// Mobile:  name(1fr) | lvl(32) | DKP(48) | arrow(48)
export const ROW_GRID = 'grid grid-cols-[minmax(0,1fr)_120px_32px_56px_72px_48px] max-md:grid-cols-[minmax(0,1fr)_32px_48px_48px] items-center gap-x-1.5';

export interface RosterCharacter {
  name: string;
  class: string;
  level: number;
  status: string;
  lastRaidDate: string | null;
  earnedDkp: number;
  spentDkp: number;
}

export interface RosterMember {
  discordId: string;
  displayName: string;
  characters: RosterCharacter[];
  mainName: string | null;
  mainClass: string | null;
  mainLevel: number | null;
  earnedDkp: number;
  spentDkp: number;
  hasGuildSpace: boolean;
  isOfficer: boolean;
  isAdmin: boolean;
  isOwner: boolean;
  role: 'owner' | 'admin' | 'officer' | 'member';
}

export function selectFeatured(member: RosterMember, classFilter: string | null): RosterCharacter {
  let candidates = member.characters;

  if (classFilter) {
    const filtered = candidates.filter(c => c.class === classFilter);
    if (filtered.length > 0) candidates = filtered;
  } else {
    const mains = candidates.filter(c => c.status === 'Main');
    if (mains.length > 0) candidates = mains;
  }

  return [...candidates].sort((a, b) => {
    if (b.level !== a.level) return b.level - a.level;
    const aDate = a.lastRaidDate ? new Date(a.lastRaidDate).getTime() : 0;
    const bDate = b.lastRaidDate ? new Date(b.lastRaidDate).getTime() : 0;
    return bDate - aDate;
  })[0];
}

export function getMostRecentRaid(member: RosterMember): string | null {
  let latest: string | null = null;
  for (const c of member.characters) {
    if (c.lastRaidDate && (!latest || c.lastRaidDate > latest)) {
      latest = c.lastRaidDate;
    }
  }
  return latest;
}

interface Props {
  member: RosterMember;
  classFilter?: string | null;
  classAbbreviations?: Record<string, string>;
  onlineIds?: Set<string>;
}

export default function RosterRow({ member, classFilter, classAbbreviations, onlineIds }: Props) {
  const navigate = useNavigate();
  const featured = selectFeatured(member, classFilter ?? null);
  const dkp = featured.earnedDkp;
  const lastRaid = getMostRecentRaid(member);
  const role = member.role;
  const isOnline = onlineIds?.has(member.discordId) ?? false;

  return (
    <div className="border-b border-border-subtle">
      <button
        className={cx(ROW_GRID, 'w-full py-1 px-2 min-h-6 transition-colors duration-fast hover:bg-surface-2 text-left cursor-pointer bg-transparent border-none')}
        onClick={() => navigate(`/roster/${member.discordId}`)}
      >
        <MemberName
          name={featured?.name || member.displayName}
          classColor={featured?.class}
          role={role}
          hasGuildSpace={member.hasGuildSpace}
          isOnline={isOnline}
        />
        <Text variant="label" className="truncate max-md:hidden">{featured ? getClassShort(featured.class, classAbbreviations) : ''}</Text>
        <span className={cx(text({ variant: 'mono' }), 'font-bold text-text-dim text-center')}>{featured?.level}</span>
        <span className={cx(text({ variant: 'mono' }), 'font-bold text-yellow text-right')}>{dkp}</span>
        <span className={cx(text({ variant: 'mono' }), 'text-text-dim text-right max-md:hidden')}>{lastRaid ? timeAgo(lastRaid) : '--'}</span>
        <span className="flex items-center justify-center text-text-dim text-caption">&rsaquo;</span>
      </button>
    </div>
  );
}
