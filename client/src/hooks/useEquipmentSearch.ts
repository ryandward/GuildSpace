import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { authFetch } from '../lib/api';

export interface EquipmentSearchResult {
  characterName: string;
  slot: string;
  itemName: string;
  eqItemId: string;
  iconId: number | null;
  statsblock: string | null;
}

export function useEquipmentSearch(discordId: string | undefined, query: string) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ['equipment', 'search', discordId, query],
    queryFn: () =>
      authFetch<EquipmentSearchResult[]>(token!, `/api/roster/${discordId}/equipment/search?q=${encodeURIComponent(query)}`),
    enabled: !!token && !!discordId && query.length >= 2,
    staleTime: 2 * 60 * 1000,
  });
}
