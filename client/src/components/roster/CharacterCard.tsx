import { Text } from '../../ui';
import { text, badge, card } from '../../ui/recipes';
import { cx } from 'class-variance-authority';

function classToPip(className: string): string {
  return 'pip-' + (className || '').toLowerCase().replace(/\s+/g, '-');
}

function statusColor(status: string): 'accent' | 'green' | 'blue' | 'dim' {
  switch (status.toLowerCase()) {
    case 'main': return 'accent';
    case 'alt': return 'green';
    case 'bot': return 'blue';
    default: return 'dim';
  }
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

interface Props {
  name: string;
  class: string;
  level: number;
  status: string;
  lastRaidDate: string | null;
  onEdit?: () => void;
  /** DKP data — when present, renders a class-colored bar instead of the top stripe */
  totalDkp?: number;
  raidCount?: number;
  maxDkp?: number;
}

export default function CharacterCard(props: Props) {
  const lastRaid = props.lastRaidDate ? timeAgo(props.lastRaidDate) : null;
  const hasDkp = props.totalDkp != null && props.maxDkp;

  return (
    <div className={cx(card(), 'flex flex-col hover:bg-surface-2 transition-colors duration-fast')}>
      <div className="flex items-center gap-1.5 px-2 pt-1.5">
        <span className={cx(badge({ variant: 'status', color: statusColor(props.status) }), 'w-7 text-center shrink-0')}>{props.status}</span>
        <Text variant="body" className="font-semibold truncate">{props.name}</Text>
        {lastRaid && (
          <Text variant="caption" className="ml-auto shrink-0">{lastRaid}</Text>
        )}
      </div>
      <div className="flex items-center gap-2 px-2 pb-1.5">
        <Text variant="label">{props.class}</Text>
        <span className={cx(text({ variant: 'mono' }), 'font-bold text-text-dim')}>Lv {props.level}</span>
        {props.onEdit && (
          <button
            className="bg-transparent border-none cursor-pointer p-0 ml-auto"
            onClick={props.onEdit}
          >
            <Text variant="caption" className="hover:text-accent transition-colors duration-fast">Edit</Text>
          </button>
        )}
      </div>
      {hasDkp && (
        <div className="flex flex-col gap-0.5 px-2 pb-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className={cx(text({ variant: 'mono' }), 'font-bold text-yellow')}>{props.totalDkp}</span>
            <Text variant="caption">{props.raidCount} calls</Text>
          </div>
          <div className="h-1 bg-surface-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${classToPip(props.class)} transition-[width] duration-slow`}
              style={{ width: `${(props.totalDkp! / props.maxDkp!) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
