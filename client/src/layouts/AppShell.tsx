import { useMemo } from 'react';
import { useSocket } from '../context/SocketContext';
import { useRosterQuery } from '../hooks/useRosterQuery';
import { getMostRecentClass } from '../lib/classColors';
import AppHeader from '../components/AppHeader';
import MessageList from '../components/MessageList';
import CommandInput from '../components/CommandInput';
import Modal from '../components/Modal';

export default function AppShell() {
  const { modal } = useSocket();
  const { data: rosterData } = useRosterQuery();

  const classMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of rosterData?.members ?? []) {
      const cls = getMostRecentClass(m.characters);
      if (cls) map.set(m.discordId, cls);
    }
    return map;
  }, [rosterData]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden grain-overlay">
      <AppHeader />
      <div className="flex-1 flex flex-col overflow-hidden relative z-0">
        <div className="max-w-terminal mx-auto w-full flex-1 flex flex-col overflow-hidden chat-bg border-x border-border max-md:border-x-0 max-md:pb-7">
          <MessageList classMap={classMap} />
          <div className="px-2 pb-2 pt-1">
            <CommandInput />
          </div>
        </div>
      </div>
      {modal && <Modal />}
    </div>
  );
}
