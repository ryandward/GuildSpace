import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { authFetch } from '../lib/api';
import type { MemberDetail } from './useMemberQuery';

interface RoleUpdate {
  isOfficer?: boolean;
  isAdmin?: boolean;
}

interface RoleResult {
  ok: boolean;
  discordId: string;
  isOfficer: boolean;
  isAdmin: boolean;
}

export function useRoleMutation(discordId: string | undefined) {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (update: RoleUpdate) =>
      authFetch<RoleResult>(
        token!,
        `/api/roster/${discordId}/role`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(update),
        },
      ),
    onSuccess: (result) => {
      queryClient.setQueryData<MemberDetail>(['roster', discordId], (old) =>
        old ? { ...old, isOfficer: result.isOfficer, isAdmin: result.isAdmin, isOwner: old.isOwner } : old,
      );
      queryClient.invalidateQueries({ queryKey: ['roster'], exact: true });
    },
  });
}
