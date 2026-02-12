import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import AppHeader from '../components/AppHeader';
import ClassMosaic from '../components/roster/RosterFilters';
import MemberList from '../components/roster/RosterTable';
import type { RosterMember } from '../components/roster/RosterRow';

interface RosterData {
  members: RosterMember[];
  summary: {
    totalMembers: number;
    totalCharacters: number;
    classCounts: Record<string, number>;
  };
}

export default function RosterPage() {
  const { token } = useAuth();
  const [data, setData] = useState<RosterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState<string | null>(null);

  async function fetchRoster() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/roster', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch roster');
      const json: RosterData = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch roster');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRoster();
  }, [token]);

  // Compute level breakdown per class (how many are 60 vs total)
  const levelBreakdown = useMemo(() => {
    if (!data) return {};
    const breakdown: Record<string, { maxLevel: number; total: number }> = {};
    for (const m of data.members) {
      for (const c of m.characters) {
        if (!breakdown[c.class]) breakdown[c.class] = { maxLevel: 0, total: 0 };
        breakdown[c.class].total++;
        if (c.level >= 60) breakdown[c.class].maxLevel++;
      }
    }
    return breakdown;
  }, [data]);

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

    // Sort by featured character name
    return [...members].sort((a, b) => {
      const fa = classFilter
        ? a.characters.find(c => c.class === classFilter) || a.characters[0]
        : a.characters.find(c => c.status === 'Main') || a.characters[0];
      const fb = classFilter
        ? b.characters.find(c => c.class === classFilter) || b.characters[0]
        : b.characters.find(c => c.status === 'Main') || b.characters[0];
      return (fa?.name || '').localeCompare(fb?.name || '');
    });
  }, [data, search, classFilter]);

  return (
    <div className="app-shell">
      <AppHeader />
      <div className="roster-page">
        <div className="roster-content">
          {error && <div className="roster-error">{error}</div>}
          {loading && <div className="roster-loading">Loading...</div>}

          {!loading && data && (
            <>
              {/* The mosaic IS the page */}
              <ClassMosaic
                classCounts={data.summary.classCounts}
                levelBreakdown={levelBreakdown}
                classFilter={classFilter}
                onClassFilterChange={setClassFilter}
              />

              {/* Search + context — only visible when drilling in */}
              {classFilter && (
                <div className="roster-drilldown">
                  <div className="drilldown-header">
                    <span className="drilldown-title">{classFilter}</span>
                    <span className="drilldown-count">{filtered.length} member{filtered.length !== 1 ? 's' : ''}</span>
                    <input
                      className="drilldown-search"
                      type="text"
                      placeholder="Find..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                    />
                  </div>
                  <MemberList members={filtered} classFilter={classFilter} />
                  {filtered.length === 0 && (
                    <div className="roster-empty">No one matches.</div>
                  )}
                </div>
              )}

              {/* When no class selected, show full roster with search */}
              {!classFilter && (
                <div className="roster-drilldown">
                  <div className="drilldown-header">
                    <span className="drilldown-title">All Members</span>
                    <span className="drilldown-count">{data.summary.totalMembers}</span>
                    <input
                      className="drilldown-search"
                      type="text"
                      placeholder="Find someone..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                    />
                  </div>
                  <MemberList members={filtered} classFilter={classFilter} />
                  {filtered.length === 0 && (
                    <div className="roster-empty">No one matches.</div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
