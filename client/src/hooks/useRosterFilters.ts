import { useState, useMemo, useCallback } from 'react';
import type { RosterMember } from '../components/roster/RosterRow';
import { getMostRecentRaid } from '../components/roster/RosterRow';

export type SortField = 'name' | 'level' | 'dkp' | 'lastRaid';
export type SortDirection = 'asc' | 'desc';
export type ActivityFilter = 'all' | '30d' | '60d' | '90d' | 'inactive';

const DAY_MS = 86_400_000;

export function useRosterFilters(members: RosterMember[] | undefined) {
  const [classFilter, setClassFilter] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [levelRange, setLevelRange] = useState<[number, number]>([1, 60]);
  const [officerOnly, setOfficerOnly] = useState(false);
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('all');
  const [sortField, setSortField] = useState<SortField>('dkp');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const toggleStatus = useCallback((status: string) => {
    setStatusFilter(prev => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }, []);

  const toggleSort = useCallback((field: SortField) => {
    setSortField(prev => {
      if (prev === field) {
        setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
      } else {
        setSortDirection(field === 'name' ? 'asc' : 'desc');
      }
      return field;
    });
  }, []);

  const clearAll = useCallback(() => {
    setClassFilter(null);
    setSearch('');
    setLevelRange([1, 60]);
    setOfficerOnly(false);
    setStatusFilter(new Set());
    setActivityFilter('all');
    setSortField('dkp');
    setSortDirection('desc');
  }, []);

  const isLevelDefault = levelRange[0] === 1 && levelRange[1] === 60;

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (classFilter) count++;
    if (search) count++;
    if (!isLevelDefault) count++;
    if (officerOnly) count++;
    if (statusFilter.size > 0) count++;
    if (activityFilter !== 'all') count++;
    return count;
  }, [classFilter, search, isLevelDefault, officerOnly, statusFilter.size, activityFilter]);

  // Apply all filters EXCEPT class — used for treemap so it stays stable when clicking a class
  const filteredPreClass = useMemo(() => {
    if (!members) return [];
    const now = Date.now();

    let result: RosterMember[] = members;

    // Text search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(m =>
        m.displayName.toLowerCase().includes(q) ||
        m.characters.some(c => c.name.toLowerCase().includes(q))
      );
    }

    // Level range
    if (!isLevelDefault) {
      result = result.filter(m =>
        m.characters.some(c => c.level >= levelRange[0] && c.level <= levelRange[1])
      );
    }

    // Officer only
    if (officerOnly) {
      result = result.filter(m => m.isOfficer);
    }

    // Status filter
    if (statusFilter.size > 0) {
      result = result.filter(m =>
        m.characters.some(c => statusFilter.has(c.status))
      );
    }

    // Activity filter
    if (activityFilter !== 'all') {
      if (activityFilter === 'inactive') {
        const cutoff = now - 90 * DAY_MS;
        result = result.filter(m => {
          const latest = getMostRecentRaid(m);
          return !latest || new Date(latest).getTime() < cutoff;
        });
      } else {
        const days = Number(activityFilter.replace('d', ''));
        const cutoff = now - days * DAY_MS;
        result = result.filter(m => {
          const latest = getMostRecentRaid(m);
          return latest && new Date(latest).getTime() >= cutoff;
        });
      }
    }

    return result;
  }, [members, search, levelRange, isLevelDefault, officerOnly, statusFilter, activityFilter]);

  const filtered = useMemo(() => {
    let result = filteredPreClass;

    // Class filter — intersect with status and level on the same character
    if (classFilter) {
      result = result.filter(m =>
        m.characters.some(c =>
          c.class === classFilter &&
          (statusFilter.size === 0 || statusFilter.has(c.status)) &&
          (isLevelDefault || (c.level >= levelRange[0] && c.level <= levelRange[1]))
        )
      );
    }

    // Sort
    return [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name':
          cmp = (a.displayName || '').localeCompare(b.displayName || '');
          break;
        case 'level':
          cmp = (a.mainLevel || 0) - (b.mainLevel || 0);
          break;
        case 'dkp':
          cmp = (a.earnedDkp - a.spentDkp) - (b.earnedDkp - b.spentDkp);
          break;
        case 'lastRaid': {
          const aDate = getMostRecentRaid(a);
          const bDate = getMostRecentRaid(b);
          const aTime = aDate ? new Date(aDate).getTime() : 0;
          const bTime = bDate ? new Date(bDate).getTime() : 0;
          cmp = aTime - bTime;
          break;
        }
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [filteredPreClass, classFilter, statusFilter, isLevelDefault, levelRange, sortField, sortDirection]);

  return {
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
  };
}
