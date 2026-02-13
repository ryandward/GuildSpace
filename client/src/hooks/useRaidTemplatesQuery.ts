import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { authFetch } from '../lib/api';

export interface RaidTemplate {
  name: string;
  type: string | null;
  modifier: number;
}

export function useRaidTemplatesQuery() {
  const { token } = useAuth();
  return useQuery({
    queryKey: ['raidTemplates'],
    queryFn: () => authFetch<RaidTemplate[]>(token!, '/api/raids/templates'),
    enabled: !!token,
    staleTime: 10 * 60 * 1000,
  });
}
