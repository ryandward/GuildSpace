import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import AppHeader from '../components/AppHeader';
import RosterFilters from '../components/roster/RosterFilters';
import RosterTable from '../components/roster/RosterTable';
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
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

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

  const availableClasses = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.summary.classCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([cls]) => cls);
  }, [data]);

  const availableStatuses = useMemo(() => {
    if (!data) return [];
    const statuses = new Set<string>();
    for (const m of data.members) {
      for (const c of m.characters) {
        statuses.add(c.status);
      }
    }
    return ['Main', 'Alt', 'Bot', 'Probationary'].filter(s => statuses.has(s));
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    let members = data.members;

    if (search) {
      const q = search.toLowerCase();
      members = members.filter(m =>
        m.displayName.toLowerCase().includes(q) ||
        m.characters.some(c => c.name.toLowerCase().includes(q))
      );
    }

    if (classFilter) {
      members = members.filter(m =>
        m.characters.some(c => c.class === classFilter)
      );
    }

    if (statusFilter) {
      members = members.filter(m =>
        m.characters.some(c => c.status === statusFilter)
      );
    }

    return members;
  }, [data, search, classFilter, statusFilter]);

  return (
    <div className="app-shell">
      <AppHeader />
      <div className="roster-page">
        <div className="roster-summary">
          {data && (
            <span className="roster-stats">
              {data.summary.totalMembers} members &middot; {data.summary.totalCharacters} characters
            </span>
          )}
          <button
            className="roster-refresh"
            onClick={fetchRoster}
            disabled={loading}
            title="Refresh roster"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
        {error && <div className="roster-error">{error}</div>}
        {!loading && data && (
          <>
            <RosterFilters
              search={search}
              onSearchChange={setSearch}
              classFilter={classFilter}
              onClassFilterChange={setClassFilter}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              availableClasses={availableClasses}
              availableStatuses={availableStatuses}
            />
            <RosterTable members={filtered} classFilter={classFilter} />
            {filtered.length === 0 && (
              <div className="roster-empty">No members match your filters.</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
