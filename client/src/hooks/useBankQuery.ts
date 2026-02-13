import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { authFetch } from '../lib/api';

export interface BankSlot {
  banker: string;
  location: string;
  quantity: number;
}

export interface BankItem {
  name: string;
  totalQuantity: number;
  bankers: string[];
  slots: BankSlot[];
}

export function useBankQuery() {
  const { token } = useAuth();
  return useQuery({
    queryKey: ['bank'],
    queryFn: () => authFetch<BankItem[]>(token!, '/api/bank'),
    enabled: !!token,
    staleTime: 2 * 60 * 1000,
  });
}
