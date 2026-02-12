import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import AppHeader from '../components/AppHeader';
import { ClassChart, StatusChart, LevelChart } from '../components/roster/RosterFilters';
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

  // All characters flat — for computing stats
  const allChars = useMemo(() => {
    if (!data) return [];
    return data.members.flatMap(m => m.characters);
  }, [data]);

  // Filtered characters (respects class filter)
  const filteredChars = useMemo(() => {
    if (!classFilter) return allChars;
    return allChars.filter(c => c.class === classFilter);
  }, [allChars, classFilter]);

  // Level breakdown per class: how many at 60 vs total
  const levelBreakdown = useMemo(() => {
    const breakdown: Record<string, { max: number; total: number }> = {};
    for (const c of allChars) {
      if (!breakdown[c.class]) breakdown[c.class] = { max: 0, total: 0 };
      breakdown[c.class].total++;
      if (c.level >= 60) breakdown[c.class].max++;
    }
    return breakdown;
  }, [allChars]);

  // Level distribution (responds to class filter)
  const levelDist = useMemo(() => {
    let level60 = 0, sub60 = 0;
    for (const c of filteredChars) {
      if (c.level >= 60) level60++;
      else sub60++;
    }
    return { level60, sub60 };
  }, [filteredChars]);

  // Status counts (responds to class filter)
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of filteredChars) {
      counts[c.status] = (counts[c.status] || 0) + 1;
    }
    return counts;
  }, [filteredChars]);

  // Filtered and sorted members
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
              {/* Dashboard: charts that drive the data */}
              <div className="roster-dashboard">
                <div className="roster-dash-main">
                  <ClassChart
                    classCounts={data.summary.classCounts}
                    levelBreakdown={levelBreakdown}
                    classFilter={classFilter}
                    onClassFilterChange={setClassFilter}
                  />
                </div>
                <div className="roster-dash-side">
                  <LevelChart levelDist={levelDist} />
                  <StatusChart statusCounts={statusCounts} total={filteredChars.length} />
                </div>
              </div>

              {/* Member list below */}
              <div className="roster-members-section">
                <div className="roster-members-header">
                  <span className="roster-members-title">
                    {classFilter || 'All Members'}
                  </span>
                  <span className="roster-members-count">
                    {filtered.length}
                  </span>
                  <input
                    className="roster-members-search"
                    type="text"
                    placeholder="Search..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                <MemberList members={filtered} classFilter={classFilter} />
                {filtered.length === 0 && (
                  <div className="roster-empty">No results.</div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
