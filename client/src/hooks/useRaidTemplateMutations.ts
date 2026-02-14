import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { authFetch } from '../lib/api';
import type { RaidTemplate } from './useRaidTemplatesQuery';

export function useCreateTemplateMutation() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { name: string; type?: string; modifier: number }) =>
      authFetch<RaidTemplate>(token!, '/api/raids/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raidTemplates'] });
    },
  });
}

export function useUpdateTemplateMutation() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, ...body }: { name: string; type?: string; modifier?: number }) =>
      authFetch<RaidTemplate>(token!, `/api/raids/templates/${encodeURIComponent(name)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raidTemplates'] });
    },
  });
}

export function useDeleteTemplateMutation() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      authFetch(token!, `/api/raids/templates/${encodeURIComponent(name)}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raidTemplates'] });
    },
  });
}
