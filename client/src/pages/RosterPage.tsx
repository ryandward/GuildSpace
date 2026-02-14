import { useState, useMemo, useCallback } from 'react';
import { useRosterQuery } from '../hooks/useRosterQuery';
import { useRosterFilters } from '../hooks/useRosterFilters';
import AppHeader from '../components/AppHeader';
import { ClassChart, StatusChart, LevelChart } from '../components/roster/RosterFilters';
import MemberList from '../components/roster/RosterTable';
import RosterFilterPanel from '../components/roster/RosterFilterPanel';
import RosterHeader from '../components/roster/RosterHeader';
import { Card, Badge, Text, Input } from '../ui';
import { text } from '../ui/recipes';
import { cx } from 'class-variance-authority';

function CollapsibleCard({ id, title, count, collapsedPanels, onToggle, children }: {
  id: string;
  title: string;
  count?: number;
  collapsedPanels: Set<string>;
  onToggle: (id: string) => void;
  children: React.ReactNode;
}) {
  const collapsed = collapsedPanels.has(id);
  return (
    <Card>
      <button
        className="w-full flex items-center gap-1 py-1 px-2 min-h-6 bg-transparent border-none cursor-pointer text-left hover:bg-surface-2 transition-colors duration-fast"
        onClick={() => onToggle(id)}
      >
        <span
          className="collapse-chevron text-text-dim text-caption"
          data-expanded={!collapsed}
        >
          ›
        </span>
        <span className={text({ variant: 'overline' })}>{title}</span>
        {count != null && (
          <span className={cx(text({ variant: 'body' }), 'font-bold ml-auto')}>{count}</span>
        )}
      </button>
      <div className="collapse-container" data-expanded={!collapsed}>
        <div className="collapse-inner">
          {children}
        </div>
      </div>
    </Card>
  );
}

const ACTIVITY_LABELS: Record<string, string> = {
  '30d': 'Active 30d',
  '60d': 'Active 60d',
  '90d': 'Active 90d',
  'inactive': 'Inactive 90d+',
};

export default function RosterPage() {
  const { data, isLoading, error } = useRosterQuery();

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
    filtered,
  } = filters;

  const [collapsedPanels, setCollapsedPanels] = useState<Set<string>>(new Set(['stats', 'filters']));

  const togglePanel = useCallback((id: string) => {
    setCollapsedPanels(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const allChars = useMemo(() => {
    if (!data) return [];
    return data.members.flatMap(m => m.characters);
  }, [data]);

  const filteredChars = useMemo(() => {
    if (!classFilter) return allChars;
    return allChars.filter(c => c.class === classFilter);
  }, [allChars, classFilter]);

  const levelBreakdown = useMemo(() => {
    const breakdown: Record<string, { max: number; total: number }> = {};
    for (const c of allChars) {
      if (!breakdown[c.class]) breakdown[c.class] = { max: 0, total: 0 };
      breakdown[c.class].total++;
      if (c.level >= 60) breakdown[c.class].max++;
    }
    return breakdown;
  }, [allChars]);

  const levelDist = useMemo(() => {
    let level60 = 0, sub60 = 0;
    for (const c of filteredChars) {
      if (c.level >= 60) level60++;
      else sub60++;
    }
    return { level60, sub60 };
  }, [filteredChars]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of filteredChars) {
      counts[c.status] = (counts[c.status] || 0) + 1;
    }
    return counts;
  }, [filteredChars]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden grain-overlay">
      <AppHeader />
      <div className="flex-1 overflow-y-auto relative z-0">
        <div className="max-w-content mx-auto py-3 px-3 pb-8 w-full flex flex-col gap-2 max-md:px-1.5 max-md:py-1.5 max-md:pb-14">
          {error && <Text variant="error">{error instanceof Error ? error.message : 'Failed to fetch roster'}</Text>}
          {isLoading && <Text variant="caption" className="py-6 text-center block">Loading...</Text>}

          {!isLoading && data && (
            <>
              {/* Treemap — always shows full guild */}
              <ClassChart
                classCounts={data.summary.classCounts}
                levelBreakdown={levelBreakdown}
                classFilter={classFilter}
                onClassFilterChange={setClassFilter}
              />

              {/* Filter strip — chips per active filter */}
              <div className="flex items-center gap-1 px-0.5 min-h-6 flex-wrap">
                <Text variant="secondary" as="span" className="text-caption">Showing:</Text>
                {activeFilterCount === 0 && (
                  <Badge variant="filter">All</Badge>
                )}
                {classFilter && (
                  <Badge variant="filter" className="inline-flex items-center gap-1">
                    <span className={`w-1 h-1 rounded-full ${('pip-' + classFilter.toLowerCase().replace(/\s+/g, '-'))}`} />
                    <span>{classFilter}</span>
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

              {/* Stats — always shows full guild/class composition */}
              <CollapsibleCard
                id="stats"
                title="Stats"
                collapsedPanels={collapsedPanels}
                onToggle={togglePanel}
              >
                <div className="flex border-t border-border max-md:flex-col">
                  <LevelChart levelDist={levelDist} />
                  <StatusChart statusCounts={statusCounts} total={filteredChars.length} />
                </div>
              </CollapsibleCard>

              {/* Members */}
              <CollapsibleCard
                id="members"
                title={classFilter ? classFilter.toUpperCase() : 'ROSTER'}
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
                  <MemberList members={filtered} classFilter={classFilter} />
                  {filtered.length === 0 && (
                    <Text variant="caption" className="text-center py-4 block">No results.</Text>
                  )}
                </div>
              </CollapsibleCard>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
