import { Text } from '../../ui';
import { text, badge, card } from '../../ui/recipes';
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
}

export default function CharacterCard(props: Props) {
  const lastRaid = props.lastRaidDate ? timeAgo(props.lastRaidDate) : null;

  return (
    <div className={cx(card(), 'p-2 flex flex-col gap-1')}>
      <div className="flex items-center gap-1.5">
        <span className={`w-0.5 h-4 rounded-full shrink-0 ${classToPip(props.class)}`} />
        <Text variant="body" className="font-semibold">{props.name}</Text>
        <span className={cx(badge({ variant: 'status', color: statusColor(props.status) }))}>{props.status}</span>
        {lastRaid && (
          <Text variant="caption" className="ml-auto shrink-0">{lastRaid}</Text>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Text variant="label">{props.class}</Text>
        <span className={cx(text({ variant: 'mono' }), 'font-bold text-text-dim')}>Lv {props.level}</span>
      </div>
    </div>
  );
}
