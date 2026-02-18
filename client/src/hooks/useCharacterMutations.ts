import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { authFetch } from '../lib/api';
import type { MemberDetail } from './useMemberQuery';

interface SaveInput {
  name: string;
  class: string;
  level: number;
  status: string;
}

interface SaveResult {
  ok: boolean;
  name: string;
  class: string;
  level: number;
  status: string;
}

interface DropResult {
  ok: boolean;
  name: string;
}

export function useCharacterMutations(discordId: string | undefined) {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const save = useMutation({
    mutationFn: (data: SaveInput) =>
      authFetch<SaveResult>(
        token!,
        `/api/roster/${discordId}/characters/${encodeURIComponent(data.name)}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ class: data.class, level: data.level, status: data.status }),
        },
      ),
    onSuccess: (result) => {
      queryClient.setQueryData<MemberDetail>(['roster', discordId], (old) => {
        if (!old) return old;
        const idx = old.characters.findIndex(c => c.name === result.name);
        const existing = idx >= 0 ? old.characters[idx] : null;
        const updated = { name: result.name, class: result.class, level: result.level, status: result.status, lastRaidDate: existing?.lastRaidDate ?? null, equipmentPreview: existing?.equipmentPreview ?? null };
        const characters = idx >= 0
          ? old.characters.map((c, i) => i === idx ? updated : c)
          : [...old.characters, updated];
        return { ...old, characters };
      });
      queryClient.invalidateQueries({ queryKey: ['roster'] });
    },
  });

  const drop = useMutation({
    mutationFn: (name: string) =>
      authFetch<DropResult>(
        token!,
        `/api/roster/${discordId}/characters/${encodeURIComponent(name)}`,
        { method: 'DELETE' },
      ),
    onSuccess: (result) => {
      queryClient.setQueryData<MemberDetail>(['roster', discordId], (old) =>
        old ? { ...old, characters: old.characters.filter(c => c.name !== result.name) } : old,
      );
      queryClient.invalidateQueries({ queryKey: ['roster'] });
    },
  });

  return { save, drop };
}
