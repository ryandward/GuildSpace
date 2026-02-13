import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { authFetch } from '../lib/api';
import type { ToonInfo } from '../context/SocketContext';

export function useMyToonsQuery(enabled: boolean) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ['toons', 'mine'],
    queryFn: () => authFetch<ToonInfo[]>(token!, '/api/toons/mine'),
    enabled: enabled && !!token,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}
