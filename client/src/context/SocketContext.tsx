import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext';
import { isDmChannel } from '../lib/dmChannel';

export interface ChatMsg {
  id?: number;
  channel: string;
  userId: string;
  displayName: string;
  content: string;
  createdAt: string;
}

export type AppMessage =
  | { type: 'system'; content: string; id: string }
  | { type: 'error'; content: string; id: string }
  | { type: 'chat'; msg: ChatMsg; id: string };

interface SocketContextValue {
  socket: Socket | null;
  connected: boolean;
  messages: AppMessage[];
  activeChannel: string;
  onlineCount: number;
  onlineIds: string[];
  totalMembers: number;
  sendChat: (content: string) => void;
  switchChannel: (channel: string) => void;
}

const SocketContext = createContext<SocketContextValue | null>(null);

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
}

let messageIdCounter = 0;
function nextId() {
  return `msg_${++messageIdCounter}`;
}

export function SocketProvider({ children }: { children: ReactNode }) {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const hasConnectedOnce = useRef(false);
  const disconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [connected, setConnected] = useState(false);
  const [messagesByChannel, setMessagesByChannel] = useState<Map<string, AppMessage[]>>(new Map());
  const [activeChannel, setActiveChannel] = useState('general');
  const loadedChannels = useRef(new Set<string>());
  const activeChannelRef = useRef(activeChannel);
  activeChannelRef.current = activeChannel;
  const [onlineCount, setOnlineCount] = useState(0);
  const [onlineIds, setOnlineIds] = useState<string[]>([]);
  const [totalMembers, setTotalMembers] = useState(0);

  /** Add messages to a specific channel's array */
  const addToChannel = useCallback((channel: string, msgs: AppMessage[]) => {
    setMessagesByChannel(prev => {
      const next = new Map(prev);
      const existing = next.get(channel) || [];
      next.set(channel, [...existing, ...msgs]);
      return next;
    });
  }, []);

  // Connect socket when user + token are ready (skip in demo mode)
  useEffect(() => {
    if (!token || !user || token === 'demo') return;

    const sock = io();
    socketRef.current = sock;

    sock.on('connect', () => {
      if (disconnectTimer.current) {
        clearTimeout(disconnectTimer.current);
        disconnectTimer.current = null;
      }
      setConnected(true);
      sock.emit('auth', { token });
    });

    sock.on('disconnect', () => {
      disconnectTimer.current = setTimeout(() => {
        setConnected(false);
      }, 2000);
    });

    sock.on('authOk', () => {
      if (!hasConnectedOnce.current) {
        hasConnectedOnce.current = true;
        addToChannel('general', [{
          type: 'system',
          content: 'Connected to chat.',
          id: nextId(),
        }]);
      }
    });

    sock.on('authError', (err: { error: string }) => {
      const ch = activeChannelRef.current;
      addToChannel(ch, [{ type: 'error', content: 'Socket auth failed: ' + err.error, id: nextId() }]);
    });

    sock.on('error', (data: { error: string }) => {
      const ch = activeChannelRef.current;
      addToChannel(ch, [{ type: 'error', content: data.error, id: nextId() }]);
    });

    sock.on('chatHistory', (payload: { channel: string; messages: ChatMsg[] } | ChatMsg[]) => {
      let channel: string;
      let msgs: ChatMsg[];
      if (Array.isArray(payload)) {
        channel = 'general';
        msgs = payload;
      } else {
        channel = payload.channel;
        msgs = payload.messages;
      }
      loadedChannels.current.add(channel);
      addToChannel(channel, msgs.map(msg => ({ type: 'chat' as const, msg, id: nextId() })));
    });

    sock.on('newMessage', (msg: ChatMsg) => {
      addToChannel(msg.channel, [{ type: 'chat', msg, id: nextId() }]);
      if (isDmChannel(msg.channel)) {
        queryClient.invalidateQueries({ queryKey: ['dm-threads'] });
      }
    });

    sock.on('presenceUpdate', (data: { onlineCount: number; onlineIds: string[]; totalMembers: number }) => {
      setOnlineCount(data.onlineCount);
      setOnlineIds(data.onlineIds);
      setTotalMembers(data.totalMembers);
    });

    return () => {
      if (disconnectTimer.current) clearTimeout(disconnectTimer.current);
      sock.disconnect();
      socketRef.current = null;
    };
  }, [token, user, addToChannel]);

  function sendChat(content: string) {
    socketRef.current?.emit('chatMessage', { content, channel: activeChannelRef.current });
  }

  function switchChannel(channel: string) {
    setActiveChannel(channel);
    if (!loadedChannels.current.has(channel)) {
      socketRef.current?.emit('requestChannelHistory', { channel });
    }
  }

  // Compute messages for the active channel
  const messages = useMemo(() => {
    return messagesByChannel.get(activeChannel) || [];
  }, [messagesByChannel, activeChannel]);

  return (
    <SocketContext.Provider value={{
      socket: socketRef.current,
      connected,
      messages,
      activeChannel,
      onlineCount,
      onlineIds,
      totalMembers,
      sendChat,
      switchChannel,
    }}>
      {children}
    </SocketContext.Provider>
  );
}
