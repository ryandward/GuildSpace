interface RosterFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  classFilter: string | null;
  onClassFilterChange: (value: string | null) => void;
  statusFilter: string | null;
  onStatusFilterChange: (value: string | null) => void;
  availableClasses: string[];
  availableStatuses: string[];
  classCounts: Record<string, number>;
  totalCharacters: number;
}

function classToPip(className: string): string {
  return 'pip-' + (className || '').toLowerCase().replace(/\s+/g, '-');
}

export default function RosterFilters({
  search,
  onSearchChange,
  classFilter,
  onClassFilterChange,
  statusFilter,
  onStatusFilterChange,
  availableClasses,
  availableStatuses,
  classCounts,
  totalCharacters,
}: RosterFiltersProps) {
  return (
    <div className="roster-filters">
      {/* Class composition bar — a visual representation of guild makeup */}
      <div className="class-bar">
        {availableClasses.map(cls => {
          const count = classCounts[cls] || 0;
          const pct = totalCharacters > 0 ? (count / totalCharacters) * 100 : 0;
          return (
            <button
              key={cls}
              className={`class-bar-segment ${classToPip(cls)}${classFilter === cls ? ' active' : ''}${classFilter && classFilter !== cls ? ' dimmed' : ''}`}
              style={{ flex: pct }}
              onClick={() => onClassFilterChange(classFilter === cls ? null : cls)}
              title={`${cls}: ${count}`}
            />
          );
        })}
      </div>

      {classFilter && (
        <div className="class-bar-label">
          <span className={`class-bar-label-pip ${classToPip(classFilter)}`} />
          {classFilter} <span className="class-bar-label-count">({classCounts[classFilter] || 0})</span>
          <button className="class-bar-clear" onClick={() => onClassFilterChange(null)}>clear</button>
        </div>
      )}

      <div className="roster-toolbar">
        <input
          className="roster-search"
          type="text"
          placeholder="Find someone..."
          value={search}
          onChange={e => onSearchChange(e.target.value)}
        />
        <div className="roster-status-pills">
          {availableStatuses.map(status => (
            <button
              key={status}
              className={`status-pill${statusFilter === status ? ' active' : ''}`}
              onClick={() => onStatusFilterChange(statusFilter === status ? null : status)}
            >
              {status}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
