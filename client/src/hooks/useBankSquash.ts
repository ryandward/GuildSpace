import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { authFetch } from '../lib/api';
import type { BankImportRecord } from './useBankerHistory';

export function useBankSquash() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      authFetch<BankImportRecord>(token!, `/api/bank/history/${id}/squash`, {
        method: 'POST',
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bankHistory'] });
      queryClient.invalidateQueries({ queryKey: ['bankerHistory', data.banker] });
    },
  });
}
