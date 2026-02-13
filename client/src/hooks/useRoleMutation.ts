import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { authFetch } from '../lib/api';
import type { MemberDetail } from './useMemberQuery';

export function useRoleMutation(discordId: string | undefined) {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (isOfficer: boolean) =>
      authFetch<{ ok: boolean; discordId: string; isOfficer: boolean }>(
        token!,
        `/api/roster/${discordId}/role`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isOfficer }),
        },
      ),
    onSuccess: (result) => {
      queryClient.setQueryData<MemberDetail>(['roster', discordId], (old) =>
        old ? { ...old, isOfficer: result.isOfficer } : old,
      );
      queryClient.invalidateQueries({ queryKey: ['roster'], exact: true });
    },
  });
}
