import { useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useRosterQuery } from '../hooks/useRosterQuery';
import { getMostRecentClass } from '../lib/classColors';
import ChannelTabs from '../components/ChannelTabs';
import MessageList from '../components/MessageList';
import CommandInput from '../components/CommandInput';
import Modal from '../components/Modal';

export default function AppShell() {
  const { channelName } = useParams<{ channelName?: string }>();
  const { modal, switchChannel, activeChannel } = useSocket();
  const { data: rosterData } = useRosterQuery();

  // Sync route param to socket context
  useEffect(() => {
    const target = channelName || 'general';
    if (target !== activeChannel) {
      switchChannel(target);
    }
  }, [channelName, switchChannel, activeChannel]);

  const classMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of rosterData?.members ?? []) {
      const cls = getMostRecentClass(m.characters);
      if (cls) map.set(m.discordId, cls);
    }
    return map;
  }, [rosterData]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="max-w-terminal mx-auto w-full flex-1 flex flex-col overflow-hidden chat-bg border-x border-border max-md:border-x-0 max-md:pb-7">
        <ChannelTabs />
        <MessageList classMap={classMap} />
        <div className="px-2 pb-2 pt-1">
          <CommandInput />
        </div>
      </div>
      {modal && <Modal />}
    </div>
  );
}
