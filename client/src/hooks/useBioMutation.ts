import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { authFetch } from '../lib/api';
import type { MemberDetail } from './useMemberQuery';

export function useBioMutation(discordId: string | undefined) {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (bio: string) =>
      authFetch<{ bio: string }>(token!, '/api/profile/bio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bio }),
      }),
    onSuccess: (result) => {
      queryClient.setQueryData<MemberDetail>(['roster', discordId], (old) =>
        old ? { ...old, bio: result.bio } : old,
      );
      queryClient.invalidateQueries({ queryKey: ['roster'] });
    },
  });
}
