import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useCommandsQuery } from '../hooks/useCommandsQuery';

export interface Command {
  name: string;
  description: string;
  options: CommandOption[];
}

export interface CommandOption {
  name: string;
  description: string;
  type: string;
  required?: boolean;
  autocomplete?: boolean;
  choices?: { name: string; value: string | number }[];
  minValue?: number;
  maxValue?: number;
}

export interface AutocompleteChoice {
  name: string;
  value: string;
  metadata?: Record<string, string | number>;
}

export interface ToonInfo {
  name: string;
  class: string;
  level: number;
  status: string;
}

export interface ChatMsg {
  id?: number;
  channel: string;
  userId: string;
  displayName: string;
  content: string;
  createdAt: string;
}

export interface EmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface Embed {
  title?: string;
  description?: string;
  color?: string;
  fields?: EmbedField[];
}

export interface ButtonComponent {
  type: 'button';
  customId: string;
  label: string;
  style?: string;
}

export interface SelectComponent {
  type: 'select';
  customId: string;
  placeholder?: string;
  options: { label: string; value: string }[];
}

export type Component = ButtonComponent | SelectComponent;

export interface ComponentRow {
  components?: Component[];
}

export interface ReplyData {
  interactionId?: string;
  content?: string;
  embeds?: Embed[];
  components?: (ComponentRow | Component[] | Component)[];
}

export interface ModalField {
  customId: string;
  label: string;
  style?: string;
  placeholder?: string;
}

export interface ModalData {
  customId: string;
  title: string;
  fields: ModalField[];
}

export type AppMessage =
  | { type: 'system'; content: string; id: string }
  | { type: 'command'; content: string; id: string }
  | { type: 'error'; content: string; id: string }
  | { type: 'chat'; msg: ChatMsg; id: string }
  | { type: 'reply'; data: ReplyData; id: string; interactionId?: string }
  | { type: 'loading'; content: string; id: string; interactionId?: string };

interface SocketContextValue {
  socket: Socket | null;
  connected: boolean;
  commands: Command[];
  messages: AppMessage[];
  activeChannel: string;
  modal: ModalData | null;
  onlineCount: number;
  onlineIds: string[];
  totalMembers: number;
  closeModal: () => void;
  executeCommand: (name: string, options: Record<string, unknown>) => void;
  sendChat: (content: string) => void;
  switchChannel: (channel: string) => void;
  submitModal: (modalId: string, fields: Record<string, string>) => void;
  sendComponentInteraction: (parentInteractionId: string, customId: string, values?: string[]) => void;
  showHelp: () => void;
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

let interactionCounter = 0;
function nextInteractionId() {
  return `int_${++interactionCounter}`;
}

export function SocketProvider({ children }: { children: ReactNode }) {
  const { token, user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const hasConnectedOnce = useRef(false);
  const disconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [connected, setConnected] = useState(false);
  const [messagesByChannel, setMessagesByChannel] = useState<Map<string, AppMessage[]>>(new Map());
  const [activeChannel, setActiveChannel] = useState('general');
  const loadedChannels = useRef(new Set<string>());
  const activeChannelRef = useRef(activeChannel);
  activeChannelRef.current = activeChannel;
  // Track which channel each interaction was executed in
  const interactionChannelMap = useRef(new Map<string, string>());
  const [modal, setModal] = useState<ModalData | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const [onlineIds, setOnlineIds] = useState<string[]>([]);
  const [totalMembers, setTotalMembers] = useState(0);

  const { data: commands = [] } = useCommandsQuery(!!user);

  /** Add messages to a specific channel's array */
  const addToChannel = useCallback((channel: string, msgs: AppMessage[]) => {
    setMessagesByChannel(prev => {
      const next = new Map(prev);
      const existing = next.get(channel) || [];
      next.set(channel, [...existing, ...msgs]);
      return next;
    });
  }, []);

  /** Update messages in a specific channel using a transform function */
  const updateChannel = useCallback((channel: string, fn: (prev: AppMessage[]) => AppMessage[]) => {
    setMessagesByChannel(prev => {
      const next = new Map(prev);
      const existing = next.get(channel) || [];
      next.set(channel, fn(existing));
      return next;
    });
  }, []);

  /** Find which channel an interaction belongs to, defaulting to active */
  const channelForInteraction = useCallback((interactionId?: string): string => {
    if (interactionId) {
      return interactionChannelMap.current.get(interactionId) ?? activeChannelRef.current;
    }
    return activeChannelRef.current;
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
          content: 'Connected. Type / to see available commands.',
          id: nextId(),
        }]);
      }
    });

    sock.on('authError', (err: { error: string }) => {
      const ch = activeChannelRef.current;
      addToChannel(ch, [{ type: 'error', content: 'Socket auth failed: ' + err.error, id: nextId() }]);
    });

    sock.on('reply', (data: ReplyData) => {
      const ch = channelForInteraction(data.interactionId);
      addToChannel(ch, [{ type: 'reply', data, id: nextId(), interactionId: data.interactionId }]);
    });

    sock.on('editReply', (data: ReplyData) => {
      const ch = channelForInteraction(data.interactionId);
      updateChannel(ch, prev => {
        const idx = prev.findIndex(m => 'interactionId' in m && m.interactionId === data.interactionId);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = { type: 'reply', data, id: prev[idx].id, interactionId: data.interactionId };
          return updated;
        }
        return [...prev, { type: 'reply', data, id: nextId(), interactionId: data.interactionId }];
      });
    });

    sock.on('deferReply', (data: { interactionId: string }) => {
      const ch = channelForInteraction(data.interactionId);
      addToChannel(ch, [{
        type: 'loading',
        content: 'Thinking...',
        id: nextId(),
        interactionId: data.interactionId,
      }]);
    });

    sock.on('deleteReply', (data: { interactionId: string }) => {
      const ch = channelForInteraction(data.interactionId);
      updateChannel(ch, prev => prev.filter(m => !('interactionId' in m && m.interactionId === data.interactionId)));
    });

    sock.on('followUp', (data: ReplyData) => {
      const ch = channelForInteraction(data.interactionId);
      addToChannel(ch, [{ type: 'reply', data, id: nextId() }]);
    });

    sock.on('showModal', (data: ModalData) => {
      setModal(data);
    });

    sock.on('error', (data: { error: string }) => {
      const ch = activeChannelRef.current;
      addToChannel(ch, [{ type: 'error', content: data.error, id: nextId() }]);
    });

    sock.on('chatHistory', (payload: { channel: string; messages: ChatMsg[] } | ChatMsg[]) => {
      // Handle both new { channel, messages } shape and legacy ChatMsg[] array
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
  }, [token, user, addToChannel, updateChannel, channelForInteraction]);

  function executeCommand(name: string, options: Record<string, unknown>) {
    const sock = socketRef.current;
    if (!sock) return;

    const interactionId = nextInteractionId();
    const ch = activeChannelRef.current;
    // Track which channel this interaction was executed in
    interactionChannelMap.current.set(interactionId, ch);

    addToChannel(ch, [{
      type: 'command',
      content: `/${name}${Object.entries(options).map(([k, v]) => ` ${v}`).join('')}`,
      id: nextId(),
    }]);

    sock.emit('executeCommand', { interactionId, command: name, options });
  }

  function sendChat(content: string) {
    socketRef.current?.emit('chatMessage', { content, channel: activeChannelRef.current });
  }

  function switchChannel(channel: string) {
    setActiveChannel(channel);
    if (!loadedChannels.current.has(channel)) {
      socketRef.current?.emit('requestChannelHistory', { channel });
    }
  }

  function submitModalFn(modalId: string, fields: Record<string, string>) {
    const interactionId = nextInteractionId();
    interactionChannelMap.current.set(interactionId, activeChannelRef.current);
    socketRef.current?.emit('submitModal', { interactionId, modalId, fields });
    setModal(null);
  }

  function sendComponentInteraction(parentInteractionId: string, customId: string, values?: string[]) {
    const interactionId = nextInteractionId();
    socketRef.current?.emit('componentInteraction', {
      interactionId,
      parentInteractionId,
      customId,
      values,
    });
  }

  function showHelp() {
    const lines = commands.map(c => `  /${c.name} — ${c.description}`).join('\n');
    const ch = activeChannelRef.current;
    addToChannel(ch, [{
      type: 'system',
      content: `Available commands:\n${lines}`,
      id: nextId(),
    }]);
  }

  // Compute messages for the active channel — MessageList sees a flat array
  const messages = useMemo(() => {
    return messagesByChannel.get(activeChannel) || [];
  }, [messagesByChannel, activeChannel]);

  return (
    <SocketContext.Provider value={{
      socket: socketRef.current,
      connected,
      commands,
      messages,
      activeChannel,
      modal,
      onlineCount,
      onlineIds,
      totalMembers,
      closeModal: () => setModal(null),
      executeCommand,
      sendChat,
      switchChannel,
      submitModal: submitModalFn,
      sendComponentInteraction,
      showHelp,
    }}>
      {children}
    </SocketContext.Provider>
  );
}
