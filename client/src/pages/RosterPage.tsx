import { useState, useMemo, useCallback } from 'react';
import { useRosterQuery } from '../hooks/useRosterQuery';
import AppHeader from '../components/AppHeader';
import { ClassChart, StatusChart, LevelChart } from '../components/roster/RosterFilters';
import MemberList from '../components/roster/RosterTable';
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

export default function RosterPage() {
  const { data, isLoading, error } = useRosterQuery();

  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState<string | null>(null);
  const [collapsedPanels, setCollapsedPanels] = useState<Set<string>>(new Set(['stats']));

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

  const filtered = useMemo(() => {
    if (!data) return [];
    let members = data.members;

    if (classFilter) {
      members = members.filter(m =>
        m.characters.some(c => c.class === classFilter)
      );
    }

    if (search) {
      const q = search.toLowerCase();
      members = members.filter(m =>
        m.displayName.toLowerCase().includes(q) ||
        m.characters.some(c => c.name.toLowerCase().includes(q))
      );
    }

    return [...members].sort((a, b) =>
      (b.earnedDkp - b.spentDkp) - (a.earnedDkp - a.spentDkp)
    );
  }, [data, search, classFilter]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden grain-overlay">
      <AppHeader />
      <div className="flex-1 overflow-y-auto relative z-0">
        <div className="max-w-content mx-auto py-3 px-3 pb-8 w-full flex flex-col gap-2 max-md:px-1.5 max-md:py-1.5 max-md:pb-14">
          {error && <Text variant="error">{error instanceof Error ? error.message : 'Failed to fetch roster'}</Text>}
          {isLoading && <Text variant="caption" className="py-6 text-center block">Loading...</Text>}

          {!isLoading && data && (
            <>
              {/* Treemap */}
              <ClassChart
                classCounts={data.summary.classCounts}
                levelBreakdown={levelBreakdown}
                classFilter={classFilter}
                onClassFilterChange={setClassFilter}
              />

              {/* Filter strip */}
              <div className="flex items-center gap-1 px-0.5">
                <Text variant="secondary" as="span" className="text-caption">Showing:</Text>
                {classFilter ? (
                  <>
                    <Badge variant="filter" className="inline-flex items-center gap-1">
                      <span className={`w-1 h-1 rounded-full ${('pip-' + classFilter.toLowerCase().replace(/\s+/g, '-'))}`} />
                      <span>{classFilter}</span>
                    </Badge>
                    <button
                      className="bg-transparent border-none cursor-pointer transition-colors duration-fast"
                      onClick={() => setClassFilter(null)}
                    >
                      <Text variant="caption" className="hover:text-red">Clear</Text>
                    </button>
                  </>
                ) : (
                  <Text variant="caption" as="span">All Classes</Text>
                )}
              </div>

              {/* Stats */}
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
