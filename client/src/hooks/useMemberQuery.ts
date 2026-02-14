import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { authFetch } from '../lib/api';

export interface CharacterDkp {
  name: string;
  class: string;
  totalDkp: number;
  raidCount: number;
}

export interface MemberDetail {
  discordId: string;
  displayName: string;
  bio: string | null;
  isOfficer: boolean;
  isAdmin: boolean;
  isOwner: boolean;
  role: 'owner' | 'admin' | 'officer' | 'member';
  officerSince: string | null;
  adminSince: string | null;
  joinedAt: string | null;
  characters: {
    name: string;
    class: string;
    level: number;
    status: string;
    lastRaidDate: string | null;
  }[];
  earnedDkp: number;
  spentDkp: number;
  dkpByCharacter: CharacterDkp[];
}

export function useMemberQuery(discordId: string | undefined) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ['roster', discordId],
    queryFn: () => authFetch<MemberDetail>(token!, `/api/roster/${discordId}`),
    enabled: !!token && !!discordId,
    staleTime: 1 * 60 * 1000,
  });
}
