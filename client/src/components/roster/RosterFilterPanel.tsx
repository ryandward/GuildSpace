import { Button, Select, RangeSlider } from '../../ui';
import { text } from '../../ui/recipes';
import type { ActivityFilter } from '../../hooks/useRosterFilters';

const STATUSES = ['Main', 'Alt', 'Bot', 'Probationary'] as const;

const STATUS_COLORS: Record<string, string> = {
  Main: 'bg-accent',
  Alt: 'bg-green',
  Bot: 'bg-yellow',
  Probationary: 'bg-text-dim',
};

interface Props {
  levelRange: [number, number];
  onLevelRangeChange: (v: [number, number]) => void;
  officerOnly: boolean;
  onOfficerToggle: () => void;
  statusFilter: Set<string>;
  onStatusToggle: (status: string) => void;
  activityFilter: ActivityFilter;
  onActivityChange: (v: ActivityFilter) => void;
}

export default function RosterFilterPanel({
  levelRange, onLevelRangeChange,
  officerOnly, onOfficerToggle,
  statusFilter, onStatusToggle,
  activityFilter, onActivityChange,
}: Props) {
  return (
    <div className="flex flex-wrap items-start gap-3 px-2 py-1.5 border-t border-border">
      {/* Level Range */}
      <div className="flex flex-col gap-1 min-w-28">
        <span className={text({ variant: 'overline' })}>Level</span>
        <div className="flex items-center gap-1.5">
          <RangeSlider min={1} max={60} value={levelRange} onChange={onLevelRangeChange} />
          <span className={text({ variant: 'mono' })}>
            {levelRange[0]}–{levelRange[1]}
          </span>
        </div>
      </div>

      {/* Officer toggle */}
      <div className="flex flex-col gap-1">
        <span className={text({ variant: 'overline' })}>Role</span>
        <Button
          intent="ghost"
          size="sm"
          className={officerOnly ? 'border-accent text-accent' : ''}
          onClick={onOfficerToggle}
        >
          Officer
        </Button>
      </div>

      {/* Status multi-select */}
      <div className="flex flex-col gap-1">
        <span className={text({ variant: 'overline' })}>Status</span>
        <div className="flex gap-0.5">
          {STATUSES.map(s => {
            const active = statusFilter.has(s);
            return (
              <Button
                key={s}
                intent="ghost"
                size="sm"
                className={active ? 'border-accent text-text' : ''}
                onClick={() => onStatusToggle(s)}
              >
                <span className={`inline-block size-1 rounded-full ${STATUS_COLORS[s]} mr-0.5`} />
                {s}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Activity filter */}
      <div className="flex flex-col gap-1">
        <span className={text({ variant: 'overline' })}>Activity</span>
        <Select
          size="sm"
          variant="surface"
          value={activityFilter}
          onChange={e => onActivityChange(e.target.value as ActivityFilter)}
        >
          <option value="all">Any Activity</option>
          <option value="30d">Active (30d)</option>
          <option value="60d">Active (60d)</option>
          <option value="90d">Active (90d)</option>
          <option value="inactive">Inactive (90d+)</option>
        </Select>
      </div>
    </div>
  );
}
