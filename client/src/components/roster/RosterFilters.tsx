interface RosterFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  classFilter: string | null;
  onClassFilterChange: (value: string | null) => void;
  statusFilter: string | null;
  onStatusFilterChange: (value: string | null) => void;
  availableClasses: string[];
  availableStatuses: string[];
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
}: RosterFiltersProps) {
  return (
    <div className="roster-filters">
      <input
        className="roster-search"
        type="text"
        placeholder="Search by name..."
        value={search}
        onChange={e => onSearchChange(e.target.value)}
      />
      <div className="roster-filter-group">
        <div className="roster-filter-pills">
          {availableStatuses.map(status => (
            <button
              key={status}
              className={`filter-pill${statusFilter === status ? ' active' : ''}`}
              onClick={() => onStatusFilterChange(statusFilter === status ? null : status)}
            >
              {status}
            </button>
          ))}
        </div>
        <div className="roster-filter-pills">
          {availableClasses.map(cls => (
            <button
              key={cls}
              className={`filter-pill${classFilter === cls ? ' active' : ''}`}
              onClick={() => onClassFilterChange(classFilter === cls ? null : cls)}
            >
              {cls}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
