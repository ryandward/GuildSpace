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
        className="w-full grid grid-cols-[3px_1fr_80px_28px_100px_54px_20px] items-center gap-1 py-1 px-0.5 transition-colors duration-fast hover:bg-surface text-left max-md:grid-cols-[3px_1fr_28px_48px_20px] cursor-pointer bg-transparent border-none"
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
          <div className="collapse-inner">
            <div className="pl-2 border-l-2 border-accent-dim ml-1">
              {alts.map((c, i) => (
                <div
                  key={c.name}
                  className="grid grid-cols-[2px_1fr_60px_28px_auto] items-center gap-1 py-0.5 px-0.5 transition-colors duration-fast hover:bg-surface"
                  style={{
                    ...(classFilter && c.class === classFilter ? { backgroundColor: 'color-mix(in oklch, var(--color-accent) calc(var(--opacity-2) * 100%), transparent)' } : {}),
                    ...(expanded ? { animationDelay: `${delays[i]}ms` } : {}),
                  }}
                >
                  <span className={`w-0.5 h-1.5 rounded-full ${classToPip(c.class)}`} />
                  <Text variant="caption" className="text-text-secondary truncate">{c.name}</Text>
                  <Text variant="label" className="text-nano">{c.class}</Text>
                  <span className={cx(text({ variant: 'mono' }), 'text-micro text-text-dim text-center')}>{c.level}</span>
                  <Badge variant="status" color={statusColor(c.status)}>{c.status}</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
