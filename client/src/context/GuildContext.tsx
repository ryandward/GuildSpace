import { createContext, useContext, type ReactNode } from 'react';

export interface GuildContextValue {
  guildId: string;
  guildName: string;
  isDemo: boolean;
}

const GuildContext = createContext<GuildContextValue | null>(null);

export function useGuild() {
  const ctx = useContext(GuildContext);
  if (!ctx) throw new Error('useGuild must be used within GuildProvider');
  return ctx;
}

export function GuildProvider({ value, children }: { value: GuildContextValue; children: ReactNode }) {
  return (
    <GuildContext.Provider value={value}>
      {children}
    </GuildContext.Provider>
  );
}
