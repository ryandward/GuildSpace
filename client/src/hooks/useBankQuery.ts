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
  iconId: number | null;
  classes: string[];
  races: string[];
  statsblock: string | null;
}

export interface BankData {
  items: BankItem[];
  availableClasses: string[];
  availableRaces: string[];
}

export function useBankQuery() {
  const { token } = useAuth();
  return useQuery({
    queryKey: ['bank'],
    queryFn: () => authFetch<BankData>(token!, '/api/bank'),
    enabled: !!token,
    staleTime: 2 * 60 * 1000,
  });
}
