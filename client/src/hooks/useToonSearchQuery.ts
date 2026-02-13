import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { authFetch } from '../lib/api';

export function useToonSearchQuery(q: string) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ['toons', 'search', q],
    queryFn: () => authFetch<string[]>(token!, `/api/toons/search?q=${encodeURIComponent(q)}`),
    enabled: !!token && q.length > 0,
    staleTime: 10 * 1000,
    gcTime: 30 * 1000,
  });
}
