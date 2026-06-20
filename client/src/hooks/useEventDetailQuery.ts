import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { authFetch } from '../lib/api';

export interface CallAttendee {
  characterName: string;
  discordId: string;
  characterClass: string | null;
}

export interface UnrecognizedName {
  name: string;
  level: number | null;
  className: string | null;
}

export interface DismissedName {
  name: string;
  reason: string | null;
  dismissedBy: string;
  dismissedAt: string;
}

export interface CallDetail {
  id: number;
  raidName: string;
  modifier: number;
  recordedCount: number;
  rejectedCount: number;
  createdBy: string;
  createdAt: string;
  attendees: CallAttendee[];
  unrecognized: UnrecognizedName[];
  dismissed: DismissedName[];
}

export interface EventMember {
  discordId: string;
  displayName: string;
  mainClass: string | null;
  callsPresent: number[];
  totalDkp: number;
  hasGuildSpace: boolean;
  isOfficer: boolean;
  isAdmin: boolean;
  isOwner: boolean;
  role: 'owner' | 'admin' | 'officer' | 'member';
}

export interface EventDetail {
  event: {
    id: number;
    name: string;
    status: string;
    createdBy: string;
    createdAt: string;
    closedAt: string | null;
  };
  calls: CallDetail[];
  members: EventMember[];
}

export function useEventDetailQuery(eventId: string | undefined) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ['raidEvent', eventId],
    queryFn: () => authFetch<EventDetail>(token!, `/api/raids/events/${eventId}`),
    enabled: !!token && !!eventId,
    staleTime: 15 * 1000,
  });
}
