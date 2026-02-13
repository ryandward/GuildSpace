import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { authFetch } from '../lib/api';

export interface BankImportDiff {
  added: { name: string; quantity: number }[];
  removed: { name: string; quantity: number }[];
  changed: { name: string; oldQuantity: number; newQuantity: number }[];
}

export interface BankImportRecord {
  id: string;
  banker: string;
  uploadedBy: string;
  uploadedByName: string;
  itemCount: number;
  diff: BankImportDiff;
  createdAt: string;
}

export function useBankerHistory(banker: string | undefined) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ['bankerHistory', banker],
    queryFn: () => authFetch<BankImportRecord[]>(token!, `/api/bank/${encodeURIComponent(banker!)}/history`),
    enabled: !!token && !!banker,
    staleTime: 60 * 1000,
  });
}
