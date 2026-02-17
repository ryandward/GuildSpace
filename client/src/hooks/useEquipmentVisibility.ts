import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { authFetch } from '../lib/api';
import type { MemberDetail } from './useMemberQuery';

export function useEquipmentVisibility(discordId: string | undefined) {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (visible: boolean) =>
      authFetch<{ ok: boolean; equipmentPublic: boolean }>(token!, '/api/profile/equipment-visibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visible }),
      }),
    onSuccess: (result) => {
      queryClient.setQueryData<MemberDetail>(['roster', discordId], (old) =>
        old ? { ...old, equipmentPublic: result.equipmentPublic } : old,
      );
    },
  });
}
