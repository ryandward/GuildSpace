import { useEffect, useState, useMemo } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import AppHeader from '../components/AppHeader';
import MessageList from '../components/MessageList';
import CommandInput from '../components/CommandInput';
import Modal from '../components/Modal';

interface RosterChar {
  class: string;
  lastRaidDate: string | null;
}

interface RosterMember {
  discordId: string;
  characters: RosterChar[];
}

export default function AppShell() {
  const { modal } = useSocket();
  const { token } = useAuth();
  const [roster, setRoster] = useState<RosterMember[]>([]);

  useEffect(() => {
    if (!token) return;
    fetch('/api/roster', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.members) setRoster(data.members); })
      .catch(() => {});
  }, [token]);

  // Map discordId → class of most recently raided character
  const classMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of roster) {
      let best: RosterChar | null = null;
      for (const c of m.characters) {
        if (!c.lastRaidDate) continue;
        if (!best || !best.lastRaidDate || c.lastRaidDate > best.lastRaidDate) {
          best = c;
        }
      }
      if (best) map.set(m.discordId, best.class);
    }
    return map;
  }, [roster]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden grain-overlay">
      <AppHeader />
      <div className="flex-1 overflow-y-auto flex flex-col relative z-0 chat-bg">
        <div className="max-w-terminal mx-auto w-full flex-1 flex flex-col">
          <MessageList classMap={classMap} />
        </div>
      </div>
      <div className="max-w-terminal mx-auto w-full px-2 pb-2">
        <CommandInput />
      </div>
      {modal && <Modal />}
    </div>
  );
}
