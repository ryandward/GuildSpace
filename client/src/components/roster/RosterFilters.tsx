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
}: RosterFiltersProps) {
  return (
    <div className="roster-filters">
      <div className="roster-filter-row">
        <input
          className="roster-search"
          type="text"
          placeholder="Search names..."
          value={search}
          onChange={e => onSearchChange(e.target.value)}
        />
        <div className="roster-filter-pills">
          {availableStatuses.map(status => (
            <button
              key={status}
              className={`filter-pill status-pill${statusFilter === status ? ' active' : ''}`}
              onClick={() => onStatusFilterChange(statusFilter === status ? null : status)}
            >
              {status}
            </button>
          ))}
        </div>
      </div>
      <div className="roster-filter-pills class-pills">
        {availableClasses.map(cls => (
          <button
            key={cls}
            className={`filter-pill class-pill${classFilter === cls ? ' active' : ''}`}
            onClick={() => onClassFilterChange(classFilter === cls ? null : cls)}
          >
            <span className={`filter-pip ${classToPip(cls)}`} />
            {cls}
            <span className="filter-count">{classCounts[cls] || 0}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
