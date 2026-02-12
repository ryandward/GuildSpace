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
    <div className="flex flex-1 flex-col overflow-hidden">
      <AppHeader />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1100px] mx-auto py-6 px-6 pb-16 w-full flex flex-col max-md:px-2 max-md:py-2.5 max-md:pb-10">
          {error && <div className="text-red text-xs">{error}</div>}
          {loading && <div className="text-text-dim text-xs py-12 text-center">Loading...</div>}

          {!loading && data && (
            <>
              <ClassChart
                classCounts={data.summary.classCounts}
                levelBreakdown={levelBreakdown}
                classFilter={classFilter}
                onClassFilterChange={setClassFilter}
              />

              <div className="flex border-b border-border max-md:flex-col">
                <LevelChart levelDist={levelDist} />
                <StatusChart statusCounts={statusCounts} total={filteredChars.length} />
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-2 py-2.5 pb-2 border-b border-border max-md:flex-wrap">
                  <span className="text-[10px] font-bold text-text-dim tracking-wide">
                    {classFilter ? `// ${classFilter.toUpperCase()}` : '// ROSTER'}
                  </span>
                  <span className="text-xs font-bold text-text">{filtered.length}</span>
                  <input
                    className="ml-auto bg-transparent border border-border text-text font-mono text-xs py-0.5 px-2 w-[140px] focus:outline-none focus:border-accent placeholder:text-text-dim/40 max-md:w-full max-md:ml-0"
                    type="text"
                    placeholder="search..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                <MemberList members={filtered} classFilter={classFilter} />
                {filtered.length === 0 && (
                  <div className="text-text-dim text-xs text-center py-8">No results.</div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
