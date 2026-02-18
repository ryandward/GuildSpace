import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { authFetch } from '../lib/api';
import type { EquipmentItem } from '../components/roster/EquipmentGrid';

export function useBankerEquipment(banker: string | undefined) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ['equipment', 'banker', banker],
    queryFn: () =>
      authFetch<EquipmentItem[]>(token!, `/api/bank/${encodeURIComponent(banker!)}/equipment`),
    enabled: !!token && !!banker,
    staleTime: 2 * 60 * 1000,
  });
}
