import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { authFetch } from '../lib/api';
import type { EquipmentItem } from '../components/roster/EquipmentGrid';

export function useEquipmentQuery(discordId: string, characterName: string) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ['equipment', discordId, characterName],
    queryFn: () =>
      authFetch<EquipmentItem[]>(token!, `/api/roster/${discordId}/characters/${encodeURIComponent(characterName)}/equipment`),
    enabled: !!token && !!discordId && !!characterName,
    staleTime: 2 * 60 * 1000,
  });
}
