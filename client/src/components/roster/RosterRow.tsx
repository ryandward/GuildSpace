import { phiStagger } from '../../utils/stagger';
import { Badge, Text } from '../../ui';
import { text, badge } from '../../ui/recipes';
import { cx } from 'class-variance-authority';

function classToPip(className: string): string {
  return 'pip-' + (className || '').toLowerCase().replace(/\s+/g, '-');
}

function statusColor(status: string): 'accent' | 'green' | 'yellow' | 'dim' {
  switch (status.toLowerCase()) {
    case 'main': return 'accent';
    case 'alt': return 'green';
    case 'bot': return 'yellow';
    default: return 'dim';
  }
}

const ROW_GRID = 'grid grid-cols-[3px_1fr_80px_28px_100px_54px_20px] max-md:grid-cols-[3px_1fr_28px_48px_20px] items-center gap-1';

export interface RosterCharacter {
  name: string;
  class: string;
  level: number;
  status: string;
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
}

interface Props {
  member: RosterMember;
  classFilter?: string | null;
  expanded: boolean;
  onToggle: () => void;
}

export default function RosterRow({ member, classFilter, expanded, onToggle }: Props) {
  const featured = classFilter
    ? member.characters.find(c => c.class === classFilter) || member.characters[0]
    : member.characters.find(c => c.status === 'Main') || member.characters[0];

  const netDkp = member.earnedDkp - member.spentDkp;
  const alts = member.characters.filter(c => c !== featured);
  const hasAlts = alts.length > 0;
  const delays = expanded ? phiStagger(alts.length) : [];

  return (
    <div className="border-b border-border-subtle">
      <button
        className={cx(ROW_GRID, 'w-full py-1 px-0.5 transition-colors duration-fast hover:bg-surface text-left cursor-pointer bg-transparent border-none')}
        onClick={onToggle}
      >
        <span className={`w-0.5 self-stretch rounded-full ${classToPip(featured?.class || '')}`} />
        <Text variant="body" className="font-semibold truncate">{featured?.name || member.displayName}</Text>
        <Text variant="label" className="truncate max-md:hidden">{featured?.class}</Text>
        <span className={cx(text({ variant: 'mono' }), 'font-bold text-text-dim text-center')}>{featured?.level}</span>
        <Text variant="label" className="truncate max-md:hidden" style={{ opacity: 'var(--opacity-5)' }}>{member.displayName}</Text>
        <span className={cx(text({ variant: 'mono' }), 'font-bold text-yellow text-right')}>{netDkp}</span>
        <span className="flex items-center justify-center">
          {hasAlts ? (
            <span
              className="collapse-chevron text-text-dim text-caption"
              data-expanded={expanded}
            >
              ›
            </span>
          ) : (
            <span className="text-text-dim/20 text-caption">·</span>
          )}
        </span>
      </button>

      {hasAlts && (
        <div className="collapse-container" data-expanded={expanded}>
          <div className="collapse-inner bg-surface rounded-sm" key={expanded ? 'open' : 'closed'}>
            {alts.map((c, i) => (
              <div
                key={c.name}
                className={cx(ROW_GRID, 'py-0.5 px-0.5 transition-colors duration-fast hover:bg-surface-2 animate-alt-row-enter')}
                style={{
                  ...(classFilter && c.class === classFilter ? { backgroundColor: 'color-mix(in oklch, var(--color-accent) calc(var(--opacity-2) * 100%), transparent)' } : {}),
                  ...(expanded ? { animationDelay: `${delays[i]}ms` } : {}),
                }}
              >
                <span className={`w-0.5 h-1.5 rounded-full ${classToPip(c.class)}`} />
                <Text variant="caption" className="text-text-secondary truncate pl-3">
                  {c.name}
                  <Badge variant="status" color={statusColor(c.status)} className="ml-1.5 md:hidden">{c.status}</Badge>
                </Text>
                <Text variant="label" className="text-nano max-md:hidden">{c.class}</Text>
                <span className={cx(text({ variant: 'mono' }), 'text-micro text-text-dim text-center')}>{c.level}</span>
                <span className="max-md:hidden">
                  <Badge variant="status" color={statusColor(c.status)}>{c.status}</Badge>
                </span>
                <span />
                <span />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
