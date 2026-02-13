import { useQuery } from '@tanstack/react-query';
import type { Command } from '../context/SocketContext';

export function useCommandsQuery(enabled: boolean) {
  return useQuery({
    queryKey: ['commands'],
    queryFn: async () => {
      const res = await fetch('/api/commands');
      if (!res.ok) throw new Error('Failed to fetch commands');
      return res.json() as Promise<Command[]>;
    },
    enabled,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
