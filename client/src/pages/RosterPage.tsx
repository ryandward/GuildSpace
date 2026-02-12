import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import AppHeader from '../components/AppHeader';
import RosterFilters from '../components/roster/RosterFilters';
import RosterGrid from '../components/roster/RosterTable';
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
  const [selectedMember, setSelectedMember] = useState<string | null>(null);

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

    // Sort alphabetically by featured character name
    return [...members].sort((a, b) => {
      const fa = classFilter
        ? a.characters.find(c => c.class === classFilter) || a.characters[0]
        : a.characters.find(c => c.status === 'Main') || a.characters[0];
      const fb = classFilter
        ? b.characters.find(c => c.class === classFilter) || b.characters[0]
        : b.characters.find(c => c.status === 'Main') || b.characters[0];
      return (fa?.name || '').localeCompare(fb?.name || '');
    });
  }, [data, search, classFilter, statusFilter]);

  return (
    <div className="app-shell">
      <AppHeader />
      <div className="roster-page">
        <div className="roster-content">
          {/* Guild headline */}
          <div className="roster-headline">
            <div className="roster-headline-text">
              <h2>Guild Roster</h2>
              {data && (
                <p>{data.summary.totalMembers} members, {data.summary.totalCharacters} characters across Norrath</p>
              )}
            </div>
            {!loading && (
              <button className="roster-reload" onClick={fetchRoster} title="Refresh">&#x21bb;</button>
            )}
          </div>

          {/* Class composition bar — visual + interactive */}
          {data && (
            <RosterFilters
              search={search}
              onSearchChange={setSearch}
              classFilter={classFilter}
              onClassFilterChange={cls => { setClassFilter(cls); setSelectedMember(null); }}
              statusFilter={statusFilter}
              onStatusFilterChange={s => { setStatusFilter(s); setSelectedMember(null); }}
              availableClasses={availableClasses}
              availableStatuses={availableStatuses}
              classCounts={data.summary.classCounts}
              totalCharacters={data.summary.totalCharacters}
            />
          )}

          {error && <div className="roster-error">{error}</div>}

          {loading && <div className="roster-loading">Loading roster...</div>}

          {!loading && data && filtered.length > 0 && (
            <RosterGrid
              members={filtered}
              classFilter={classFilter}
              selectedMember={selectedMember}
              onSelectMember={id => setSelectedMember(id === selectedMember ? null : id)}
            />
          )}

          {!loading && data && filtered.length === 0 && (
            <div className="roster-empty">No one here matches that.</div>
          )}
        </div>
      </div>
    </div>
  );
}
