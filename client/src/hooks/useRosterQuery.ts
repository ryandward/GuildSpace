import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { authFetch } from '../lib/api';
import type { RosterMember } from '../components/roster/RosterRow';

export interface RosterData {
  members: RosterMember[];
  summary: {
    totalMembers: number;
    totalCharacters: number;
    classCounts: Record<string, number>;
  };
}

export function useRosterQuery() {
  const { token } = useAuth();
  return useQuery({
    queryKey: ['roster'],
    queryFn: () => authFetch<RosterData>(token!, '/api/roster'),
    enabled: !!token,
    staleTime: 2 * 60 * 1000,
  });
}
