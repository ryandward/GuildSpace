import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { authFetch } from '../lib/api';
import type { EventComment } from './useEventCommentsQuery';

export function usePostCommentMutation(eventId: string | undefined) {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (content: string) =>
      authFetch<EventComment>(token!, `/api/raids/events/${eventId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raidEventComments', eventId] });
    },
  });
}

export function useDeleteCommentMutation(eventId: string | undefined) {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentId: number) =>
      authFetch<{ ok: true }>(token!, `/api/raids/events/${eventId}/comments/${commentId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raidEventComments', eventId] });
    },
  });
}
