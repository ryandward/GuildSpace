import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { authFetch } from '../lib/api';

export interface DmThread {
  channel: string;
  otherUserId: string;
  otherDisplayName: string;
  lastMessage: string;
  lastMessageAt: string;
}

export function useDmThreadsQuery() {
  const { token, isDemo } = useAuth();
  return useQuery({
    queryKey: ['dm-threads'],
    queryFn: () => authFetch<DmThread[]>(token!, '/api/chat/dm-threads'),
    enabled: !!token && !isDemo,
    staleTime: 30_000,
  });
}
