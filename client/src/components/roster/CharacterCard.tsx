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
}

export default function CharacterCard(props: Props) {
  const lastRaid = props.lastRaidDate ? timeAgo(props.lastRaidDate) : null;

  return (
    <div className={cx(card(), 'flex flex-col hover:bg-surface-2 transition-colors duration-fast')}>
      <span className={`h-0.5 w-full ${classToPip(props.class)}`} />
      <div className="flex items-center gap-1.5 px-2 pt-1.5">
        <Text variant="body" className="font-semibold">{props.name}</Text>
        <span className={cx(badge({ variant: 'status', color: statusColor(props.status) }))}>{props.status}</span>
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
    </div>
  );
}
