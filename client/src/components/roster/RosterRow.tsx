import { useNavigate } from 'react-router-dom';
import { Text } from '../../ui';
import { text } from '../../ui/recipes';
import { cx } from 'class-variance-authority';
import { getClassColor } from '../../lib/classColors';
import { timeAgo } from '../../utils/timeAgo';

function classToPip(className: string): string {
  return 'pip-' + (className || '').toLowerCase().replace(/\s+/g, '-');
}

// Desktop: pip | name(1fr) | class(120) | lvl(32) | DKP(56) | lastRaid(72) | arrow(48)
// Mobile:  pip | name(1fr) | class(80)  | lvl(32) | DKP(48) | arrow(48)
export const ROW_GRID = 'grid grid-cols-[3px_minmax(0,1fr)_120px_32px_56px_72px_48px] max-md:grid-cols-[3px_minmax(0,1fr)_80px_32px_48px_48px] items-center gap-x-1.5';

export interface RosterCharacter {
  name: string;
  class: string;
  level: number;
  status: string;
  lastRaidDate: string | null;
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
}

function selectFeatured(member: RosterMember, classFilter: string | null): RosterCharacter {
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
}

export default function RosterRow({ member, classFilter }: Props) {
  const navigate = useNavigate();
  const featured = selectFeatured(member, classFilter ?? null);
  const netDkp = member.earnedDkp - member.spentDkp;
  const lastRaid = getMostRecentRaid(member);

  return (
    <div className="border-b border-border-subtle">
      <button
        className={cx(ROW_GRID, 'w-full py-1 px-0.5 min-h-6 transition-colors duration-fast hover:bg-surface text-left cursor-pointer bg-transparent border-none')}
        onClick={() => navigate(`/roster/${member.discordId}`)}
      >
        <span className={`w-0.5 self-stretch rounded-full ${classToPip(featured?.class || '')}`} />
        <span
          className="font-body text-body font-semibold truncate"
          style={{ color: getClassColor(featured?.class || '') }}
        >
          {featured?.name || member.displayName}
          {member.hasGuildSpace && <span className="inline-block size-1 rounded-full bg-accent ml-1 align-middle" title="GuildSpace member" />}
        </span>
        <Text variant="label" className="truncate">{featured?.class}</Text>
        <span className={cx(text({ variant: 'mono' }), 'font-bold text-text-dim text-center')}>{featured?.level}</span>
        <span className={cx(text({ variant: 'mono' }), 'font-bold text-yellow text-right')}>{netDkp}</span>
        <span className={cx(text({ variant: 'mono' }), 'text-text-dim text-right max-md:hidden')}>{lastRaid ? timeAgo(lastRaid) : '--'}</span>
        <span className="flex items-center justify-center text-text-dim text-caption">&rsaquo;</span>
      </button>
    </div>
  );
}
