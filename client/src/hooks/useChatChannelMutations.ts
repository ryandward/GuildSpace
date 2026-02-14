import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { authFetch } from '../lib/api';
import type { ChatChannel } from './useChatChannelsQuery';

export function useCreateChannelMutation() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; displayName: string; minRole: string }) =>
      authFetch<ChatChannel>(token!, '/api/chat/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatChannels'] });
    },
  });
}

export function useDeleteChannelMutation() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) =>
      authFetch<{ ok: boolean }>(token!, `/api/chat/channels/${name}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatChannels'] });
    },
  });
}
