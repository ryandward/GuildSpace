import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { authFetch } from '../lib/api';

export interface RaidEventSummary {
  id: number;
  name: string;
  status: string;
  createdBy: string;
  createdAt: string;
  closedAt: string | null;
  callCount: number;
  totalDkp: number;
  memberCount: number;
}

export function useEventsQuery(status?: string) {
  const { token } = useAuth();
  const url = status ? `/api/raids/events?status=${status}` : '/api/raids/events';
  return useQuery({
    queryKey: ['raidEvents', status],
    queryFn: () => authFetch<RaidEventSummary[]>(token!, url),
    enabled: !!token,
    staleTime: 30 * 1000,
  });
}
