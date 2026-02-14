import { cx } from 'class-variance-authority';
import { text } from '../../ui/recipes';
import { ROW_GRID } from './RosterRow';
import type { SortField, SortDirection } from '../../hooks/useRosterFilters';

interface Props {
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
}

function SortArrow({ field, current, direction }: { field: SortField; current: SortField; direction: SortDirection }) {
  if (field !== current) return null;
  return <span className="ml-0.5">{direction === 'asc' ? '▲' : '▼'}</span>;
}

export default function RosterHeader({ sortField, sortDirection, onSort }: Props) {
  const headerBtn = 'bg-transparent border-none cursor-pointer text-left hover:text-text transition-colors duration-fast p-0';

  return (
    <div className={cx(ROW_GRID, 'px-0.5 py-0.5 border-b border-border')}>
      {/* Name */}
      <button className={cx(headerBtn, text({ variant: 'overline' }))} onClick={() => onSort('name')}>
        Name<SortArrow field="name" current={sortField} direction={sortDirection} />
      </button>
      {/* Class — not sortable */}
      <span className={text({ variant: 'overline' })}>Class</span>
      {/* Level */}
      <button className={cx(headerBtn, text({ variant: 'overline' }), 'text-center')} onClick={() => onSort('level')}>
        Lv<SortArrow field="level" current={sortField} direction={sortDirection} />
      </button>
      {/* DKP */}
      <button className={cx(headerBtn, text({ variant: 'overline' }), 'text-right')} onClick={() => onSort('dkp')}>
        DKP<SortArrow field="dkp" current={sortField} direction={sortDirection} />
      </button>
      {/* Last Raid — hidden on mobile */}
      <button className={cx(headerBtn, text({ variant: 'overline' }), 'text-right max-md:hidden')} onClick={() => onSort('lastRaid')}>
        Raid<SortArrow field="lastRaid" current={sortField} direction={sortDirection} />
      </button>
      {/* arrow spacer */}
      <span />
    </div>
  );
}
