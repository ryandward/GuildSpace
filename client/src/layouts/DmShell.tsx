import { useEffect, useMemo } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { useRosterQuery } from '../hooks/useRosterQuery';
import { getMostRecentClass } from '../lib/classColors';
import { dmChannel } from '../lib/dmChannel';
import DmHeader from '../components/DmHeader';
import MessageList from '../components/MessageList';
import CommandInput from '../components/CommandInput';

export default function DmShell() {
  const { userId } = useParams<{ userId: string }>();
  const { user, isDemo } = useAuth();
  const { switchChannel, activeChannel } = useSocket();
  const { data: rosterData } = useRosterQuery();

  const channel = userId && user ? dmChannel(user.id, userId) : null;

  // Sync to socket context
  useEffect(() => {
    if (channel && channel !== activeChannel) {
      switchChannel(channel);
    }
  }, [channel, switchChannel, activeChannel]);

  const classMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of rosterData?.members ?? []) {
      const cls = getMostRecentClass(m.characters);
      if (cls) map.set(m.discordId, cls);
    }
    return map;
  }, [rosterData]);

  // Demo mode or missing params: redirect to chat
  if (isDemo || !userId || !user) return <Navigate to="/chat" replace />;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="max-w-terminal mx-auto w-full flex-1 flex flex-col overflow-hidden chat-bg border-x border-border max-md:border-x-0 max-md:pb-7">
        <DmHeader userId={userId} />
        <MessageList classMap={classMap} />
        <div className="px-2 pb-2 pt-1">
          <CommandInput />
        </div>
      </div>
    </div>
  );
}
