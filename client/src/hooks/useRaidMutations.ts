import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { authFetch } from '../lib/api';

export function useCreateEventMutation() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      authFetch(token!, '/api/raids/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raidEvents'] });
    },
  });
}

export function useCloseEventMutation(eventId: number) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      authFetch(token!, `/api/raids/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'closed' }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raidEvent', String(eventId)] });
      queryClient.invalidateQueries({ queryKey: ['raidEvents'] });
    },
  });
}

interface AddCallParams {
  raidName: string;
  modifier: number;
  whoLog: string;
}

export interface AddCallResult {
  call: { id: number; raidName: string; modifier: number; createdAt: string };
  recorded: number;
  rejected: number;
  rejectedPlayers: { name: string; reason: string }[];
}

export function useAddCallMutation(eventId: number) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: AddCallParams) =>
      authFetch<AddCallResult>(token!, `/api/raids/events/${eventId}/calls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raidEvent', String(eventId)] });
      queryClient.invalidateQueries({ queryKey: ['raidEvents'] });
      queryClient.invalidateQueries({ queryKey: ['roster'] });
    },
  });
}

export function useDeleteCallMutation(eventId: number) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (callId: number) =>
      authFetch(token!, `/api/raids/events/${eventId}/calls/${callId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raidEvent', String(eventId)] });
      queryClient.invalidateQueries({ queryKey: ['raidEvents'] });
      queryClient.invalidateQueries({ queryKey: ['roster'] });
    },
  });
}

export function useAddCharacterMutation(eventId: number) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ callId, characterName }: { callId: number; characterName: string }) =>
      authFetch(token!, `/api/raids/events/${eventId}/calls/${callId}/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterName }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raidEvent', String(eventId)] });
      queryClient.invalidateQueries({ queryKey: ['raidEvents'] });
      queryClient.invalidateQueries({ queryKey: ['roster'] });
    },
  });
}

export function useRemoveCharacterMutation(eventId: number) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ callId, characterName }: { callId: number; characterName: string }) =>
      authFetch(token!, `/api/raids/events/${eventId}/calls/${callId}/remove`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterName }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raidEvent', String(eventId)] });
      queryClient.invalidateQueries({ queryKey: ['raidEvents'] });
      queryClient.invalidateQueries({ queryKey: ['roster'] });
    },
  });
}
