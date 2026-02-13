import { Text } from '../../ui';
import { text, badge, card } from '../../ui/recipes';
import { cx } from 'class-variance-authority';

function classToPip(className: string): string {
  return 'pip-' + (className || '').toLowerCase().replace(/\s+/g, '-');
}

interface Props {
  name: string;
  class: string;
  level: number;
  status: string;
  lastRaidDate: string | null;
}

export default function CharacterCard(props: Props) {
  const lastRaid = props.lastRaidDate
    ? new Date(props.lastRaidDate).toLocaleDateString()
    : null;

  return (
    <div className={cx(card(), 'p-2 flex flex-col gap-1')}>
      <div className="flex items-center gap-1.5">
        <span className={`w-0.5 h-4 rounded-full shrink-0 ${classToPip(props.class)}`} />
        <Text variant="body" className="font-semibold">{props.name}</Text>
        <span className={cx(badge({ variant: 'status', color: 'dim' }))}>{props.status}</span>
      </div>
      <div className="flex items-center gap-2">
        <Text variant="label">{props.class}</Text>
        <span className={cx(text({ variant: 'mono' }), 'font-bold text-text-dim')}>Lv {props.level}</span>
      </div>
      {lastRaid && (
        <Text variant="caption">Last raid: {lastRaid}</Text>
      )}
    </div>
  );
}
