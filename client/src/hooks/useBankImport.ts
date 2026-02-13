import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { authFetch } from '../lib/api';

interface ImportResult {
  banker: string;
  inserted: number;
  diff: { added: number; removed: number; changed: number };
  importId: string;
}

export function useBankImport() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { filename: string; content: string }) =>
      authFetch<ImportResult>(token!, '/api/bank/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bank'] });
      queryClient.invalidateQueries({ queryKey: ['bankerHistory', data.banker] });
    },
  });
}
