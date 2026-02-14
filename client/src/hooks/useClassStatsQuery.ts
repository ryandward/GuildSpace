import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { authFetch } from '../lib/api';

export interface ClassStats {
  raidTicks: Record<string, number>;
  itemsWon: Record<string, number>;
}

export function useClassStatsQuery(enabled: boolean) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ['classStats'],
    queryFn: () => authFetch<ClassStats>(token!, '/api/roster/class-stats'),
    enabled: enabled && !!token,
    staleTime: 5 * 60 * 1000,
  });
}
