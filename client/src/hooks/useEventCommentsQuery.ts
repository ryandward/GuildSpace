import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { authFetch } from '../lib/api';

export interface EventComment {
  id: number;
  userId: string;
  displayName: string;
  content: string;
  createdAt: string;
}

export function useEventCommentsQuery(eventId: string | undefined) {
  const { token } = useAuth();

  return useQuery({
    queryKey: ['raidEventComments', eventId],
    queryFn: () => authFetch<EventComment[]>(token!, `/api/raids/events/${eventId}/comments`),
    enabled: !!token && !!eventId,
    staleTime: 30_000,
  });
}
