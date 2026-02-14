import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { authFetch } from '../lib/api';

export interface ChatChannel {
  id: number;
  name: string;
  displayName: string;
  minRole: string;
  createdBy: string;
  createdAt: string;
}

export function useChatChannelsQuery() {
  const { token } = useAuth();
  return useQuery({
    queryKey: ['chatChannels'],
    queryFn: () => authFetch<ChatChannel[]>(token!, '/api/chat/channels'),
    enabled: !!token && token !== 'demo',
    staleTime: 2 * 60 * 1000,
  });
}
