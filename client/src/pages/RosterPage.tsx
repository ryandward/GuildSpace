import { useState, useMemo, useCallback } from 'react';
import { useRosterQuery } from '../hooks/useRosterQuery';
import { useRosterFilters } from '../hooks/useRosterFilters';
import { useSocket } from '../context/SocketContext';
import { ClassChart, StatusChart, LevelChart } from '../components/roster/RosterFilters';
import MemberList from '../components/roster/RosterTable';
import RosterFilterPanel from '../components/roster/RosterFilterPanel';
import RosterHeader from '../components/roster/RosterHeader';
import CollapsibleCard from '../components/CollapsibleCard';
import { Badge, Text, Input, Select } from '../ui';
import { text } from '../ui/recipes';
import { getClassShort } from '../lib/classColors';

const ACTIVITY_LABELS: Record<string, string> = {
  '30d': 'Active 30d',
  '60d': 'Active 60d',
  '90d': 'Active 90d',
  'inactive': 'Inactive 90d+',
};

export type SizeMode = 'count' | 'earned' | 'spent' | 'net';

const SIZE_MODE_OPTIONS: { value: SizeMode; label: string }[] = [
  { value: 'count', label: 'Count' },
  { value: 'earned', label: 'Earned DKP' },
  { value: 'spent', label: 'Spent DKP' },
  { value: 'net', label: 'Net DKP' },
];

export default function RosterPage() {
  const { data, isLoading, error } = useRosterQuery();
  const { onlineIds: onlineIdsArray } = useSocket();
  const onlineIds = useMemo(() => new Set(onlineIdsArray), [onlineIdsArray]);

  const filters = useRosterFilters(data?.members);
  const {
    classFilter, setClassFilter,
    search, setSearch,
    levelRange, setLevelRange,
    officerOnly, setOfficerOnly,
    statusFilter, toggleStatus,
    activityFilter, setActivityFilter,
    sortField, sortDirection, toggleSort,
    clearAll,
    activeFilterCount,
    filteredPreClass,
    filtered,
  } = filters;

  const [sizeMode, setSizeMode] = useState<SizeMode>('count');

  const [collapsedPanels, setCollapsedPanels] = useState<Set<string>>(new Set(['stats', 'filters']));

  const togglePanel = useCallback((id: string) => {
    setCollapsedPanels(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Treemap data uses pre-class filter so the treemap stays stable when clicking a class
  // When status filter is active, narrow to matching characters (not all chars of matching members)
  const preClassChars = useMemo(() => {
    const chars = filteredPreClass.flatMap(m => m.characters);
    if (statusFilter.size === 0) return chars;
    return chars.filter(c => statusFilter.has(c.status));
  }, [filteredPreClass, statusFilter]);

  // Stats data uses post-class-filter characters
  const filteredClassChars = useMemo(() => {
    if (!classFilter) return preClassChars;
    return preClassChars.filter(c => c.class === classFilter);
  }, [preClassChars, classFilter]);

  const classCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of preClassChars) {
      counts[c.class] = (counts[c.class] || 0) + 1;
    }
    return counts;
  }, [preClassChars]);

  const classValues = useMemo(() => {
    if (sizeMode === 'count') return classCounts;
    const values: Record<string, number> = {};
    for (const m of filteredPreClass) {
      if (!m.mainClass) continue;
      let v: number;
      if (sizeMode === 'earned') v = m.earnedDkp;
      else if (sizeMode === 'spent') v = m.spentDkp;
      else v = m.earnedDkp - m.spentDkp;
      values[m.mainClass] = (values[m.mainClass] || 0) + v;
    }
    return values;
  }, [sizeMode, classCounts, filteredPreClass]);

  const levelBreakdown = useMemo(() => {
    const breakdown: Record<string, { max: number; total: number }> = {};
    for (const c of preClassChars) {
      if (!breakdown[c.class]) breakdown[c.class] = { max: 0, total: 0 };
      breakdown[c.class].total++;
      if (c.level >= 60) breakdown[c.class].max++;
    }
    return breakdown;
  }, [preClassChars]);

  const levelDist = useMemo(() => {
    let level60 = 0, sub60 = 0;
    for (const c of filteredClassChars) {
      if (c.level >= 60) level60++;
      else sub60++;
    }
    return { level60, sub60 };
  }, [filteredClassChars]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of filteredClassChars) {
      counts[c.status] = (counts[c.status] || 0) + 1;
    }
    return counts;
  }, [filteredClassChars]);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-content mx-auto py-3 px-3 pb-8 w-full flex flex-col gap-2 max-md:px-1.5 max-md:py-1.5 max-md:pb-14">
          {error && <Text variant="error">{error instanceof Error ? error.message : 'Failed to fetch roster'}</Text>}
          {isLoading && <Text variant="caption" className="py-6 text-center block">Loading...</Text>}

          {!isLoading && data && (
            <>
              {/* Treemap — redraws to reflect active filters */}
              <ClassChart
                classValues={classValues}
                sizeMode={sizeMode}
                levelBreakdown={levelBreakdown}
                classFilter={classFilter}
                onClassFilterChange={setClassFilter}
                classAbbreviations={data.classAbbreviations}
              />

              {/* Filter strip — chips per active filter + size selector */}
              <div className="flex items-center gap-1 px-0.5 min-h-6 flex-wrap">
                <Text variant="secondary" as="span" className="text-caption">Showing:</Text>
                <Select
                  size="sm"
                  value={sizeMode}
                  onChange={e => setSizeMode(e.target.value as SizeMode)}
                  className="bg-surface min-h-0 font-semibold"
                >
                  {SIZE_MODE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </Select>
                {activeFilterCount === 0 && (
                  <Badge variant="filter">All</Badge>
                )}
                {classFilter && (
                  <Badge variant="filter" className="inline-flex items-center gap-1">
                    <span className={`w-1 h-1 rounded-full ${('pip-' + classFilter.toLowerCase().replace(/\s+/g, '-'))}`} />
                    <span>{getClassShort(classFilter, data?.classAbbreviations)}</span>
                    <button
                      className="bg-transparent border-none cursor-pointer text-text-dim hover:text-red ml-0.5 p-0 text-caption"
                      onClick={() => setClassFilter(null)}
                    >
                      &times;
                    </button>
                  </Badge>
                )}
                {search && (
                  <Badge variant="filter" className="inline-flex items-center gap-1">
                    <span>"{search}"</span>
                    <button
                      className="bg-transparent border-none cursor-pointer text-text-dim hover:text-red ml-0.5 p-0 text-caption"
                      onClick={() => setSearch('')}
                    >
                      &times;
                    </button>
                  </Badge>
                )}
                {!(levelRange[0] === 1 && levelRange[1] === 60) && (
                  <Badge variant="filter" className="inline-flex items-center gap-1">
                    <span>Lv {levelRange[0]}–{levelRange[1]}</span>
                    <button
                      className="bg-transparent border-none cursor-pointer text-text-dim hover:text-red ml-0.5 p-0 text-caption"
                      onClick={() => setLevelRange([1, 60])}
                    >
                      &times;
                    </button>
                  </Badge>
                )}
                {officerOnly && (
                  <Badge variant="filter" className="inline-flex items-center gap-1">
                    <span>Officers</span>
                    <button
                      className="bg-transparent border-none cursor-pointer text-text-dim hover:text-red ml-0.5 p-0 text-caption"
                      onClick={() => setOfficerOnly(false)}
                    >
                      &times;
                    </button>
                  </Badge>
                )}
                {statusFilter.size > 0 && (
                  <Badge variant="filter" className="inline-flex items-center gap-1">
                    <span>{Array.from(statusFilter).join(', ')}</span>
                    <button
                      className="bg-transparent border-none cursor-pointer text-text-dim hover:text-red ml-0.5 p-0 text-caption"
                      onClick={() => { for (const s of statusFilter) toggleStatus(s); }}
                    >
                      &times;
                    </button>
                  </Badge>
                )}
                {activityFilter !== 'all' && (
                  <Badge variant="filter" className="inline-flex items-center gap-1">
                    <span>{ACTIVITY_LABELS[activityFilter]}</span>
                    <button
                      className="bg-transparent border-none cursor-pointer text-text-dim hover:text-red ml-0.5 p-0 text-caption"
                      onClick={() => setActivityFilter('all')}
                    >
                      &times;
                    </button>
                  </Badge>
                )}
                {activeFilterCount >= 2 && (
                  <button
                    className="bg-transparent border-none cursor-pointer text-caption text-text-dim hover:text-red transition-colors duration-fast p-0"
                    onClick={clearAll}
                  >
                    Clear all
                  </button>
                )}
              </div>

              {/* Filters */}
              <CollapsibleCard
                id="filters"
                title="Filters"
                collapsedPanels={collapsedPanels}
                onToggle={togglePanel}
              >
                <RosterFilterPanel
                  levelRange={levelRange}
                  onLevelRangeChange={setLevelRange}
                  officerOnly={officerOnly}
                  onOfficerToggle={() => setOfficerOnly(v => !v)}
                  statusFilter={statusFilter}
                  onStatusToggle={toggleStatus}
                  activityFilter={activityFilter}
                  onActivityChange={setActivityFilter}
                />
              </CollapsibleCard>

              {/* Stats — reflects active filters */}
              <CollapsibleCard
                id="stats"
                title="Stats"
                collapsedPanels={collapsedPanels}
                onToggle={togglePanel}
              >
                <div className="flex border-t border-border max-md:flex-col">
                  <LevelChart levelDist={levelDist} />
                  <StatusChart statusCounts={statusCounts} total={filteredClassChars.length} />
                </div>
              </CollapsibleCard>

              {/* Members */}
              <CollapsibleCard
                id="members"
                title={classFilter ? getClassShort(classFilter, data?.classAbbreviations) : 'ROSTER'}
                count={filtered.length}
                collapsedPanels={collapsedPanels}
                onToggle={togglePanel}
              >
                <div className="border-t border-border">
                  <div className="flex items-center gap-1 py-1 px-2 border-b border-border max-md:flex-wrap">
                    <Input
                      variant="transparent"
                      size="sm"
                      type="text"
                      placeholder="Search members..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="ml-auto w-22.5 max-md:w-full max-md:ml-0"
                    />
                  </div>
                  <RosterHeader
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={toggleSort}
                  />
                  <MemberList members={filtered} classFilter={classFilter} classAbbreviations={data.classAbbreviations} onlineIds={onlineIds} />
                  {filtered.length === 0 && (
                    <Text variant="caption" className="text-center py-4 block">No results.</Text>
                  )}
                </div>
              </CollapsibleCard>
            </>
          )}
        </div>
      </div>
  );
}
