import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { authFetch } from '../lib/api';

export function useEquipmentImport(discordId: string, characterName: string) {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (content: string) =>
      authFetch<{ ok: boolean; count: number }>(token!, `/api/roster/${discordId}/characters/${encodeURIComponent(characterName)}/equipment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment', discordId, characterName] });
    },
  });
}
