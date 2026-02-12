import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuth, type User } from './AuthContext';

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
  modal: ModalData | null;
  closeModal: () => void;
  executeCommand: (name: string, options: Record<string, unknown>) => void;
  sendChat: (content: string) => void;
  submitModal: (modalId: string, fields: Record<string, string>) => void;
  sendComponentInteraction: (parentInteractionId: string, customId: string, values?: string[]) => void;
  fetchAutocomplete: (cmdName: string, optionName: string, value: string) => Promise<{ name: string; value: string }[]>;
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
  const [connected, setConnected] = useState(false);
  const [commands, setCommands] = useState<Command[]>([]);
  const [messages, setMessages] = useState<AppMessage[]>([]);
  const [modal, setModal] = useState<ModalData | null>(null);

  // Load commands when user is available
  useEffect(() => {
    if (!user) return;
    fetch('/api/commands')
      .then(res => res.json())
      .then((cmds: Command[]) => {
        setCommands(cmds);
        setMessages(prev => [...prev, {
          type: 'system',
          content: `${cmds.length} commands loaded: ${cmds.map(c => '/' + c.name).join(', ')}`,
          id: nextId(),
        }]);
      })
      .catch(console.error);
  }, [user]);

  // Connect socket when user + token are ready
  useEffect(() => {
    if (!token || !user) return;

    const sock = io();
    socketRef.current = sock;

    sock.on('connect', () => {
      setConnected(true);
      sock.emit('auth', { token });
    });

    sock.on('disconnect', () => setConnected(false));

    sock.on('authOk', () => {
      setMessages(prev => [...prev, {
        type: 'system',
        content: 'Connected. Type / to see available commands.',
        id: nextId(),
      }]);
    });

    sock.on('authError', (err: { error: string }) => {
      setMessages(prev => [...prev, { type: 'error', content: 'Socket auth failed: ' + err.error, id: nextId() }]);
    });

    sock.on('reply', (data: ReplyData) => {
      setMessages(prev => [...prev, { type: 'reply', data, id: nextId(), interactionId: data.interactionId }]);
    });

    sock.on('editReply', (data: ReplyData) => {
      setMessages(prev => {
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
      setMessages(prev => [...prev, {
        type: 'loading',
        content: 'Thinking...',
        id: nextId(),
        interactionId: data.interactionId,
      }]);
    });

    sock.on('deleteReply', (data: { interactionId: string }) => {
      setMessages(prev => prev.filter(m => !('interactionId' in m && m.interactionId === data.interactionId)));
    });

    sock.on('followUp', (data: ReplyData) => {
      setMessages(prev => [...prev, { type: 'reply', data, id: nextId() }]);
    });

    sock.on('showModal', (data: ModalData) => {
      setModal(data);
    });

    sock.on('error', (data: { error: string }) => {
      setMessages(prev => [...prev, { type: 'error', content: data.error, id: nextId() }]);
    });

    sock.on('chatHistory', (msgs: ChatMsg[]) => {
      setMessages(prev => [
        ...prev,
        ...msgs.map(msg => ({ type: 'chat' as const, msg, id: nextId() })),
      ]);
    });

    sock.on('newMessage', (msg: ChatMsg) => {
      setMessages(prev => [...prev, { type: 'chat', msg, id: nextId() }]);
    });

    return () => {
      sock.disconnect();
      socketRef.current = null;
    };
  }, [token, user]);

  function executeCommand(name: string, options: Record<string, unknown>) {
    const sock = socketRef.current;
    if (!sock) return;

    const interactionId = nextInteractionId();
    setMessages(prev => [...prev, {
      type: 'command',
      content: `/${name}${Object.entries(options).map(([k, v]) => ` ${v}`).join('')}`,
      id: nextId(),
    }]);

    sock.emit('executeCommand', { interactionId, command: name, options });
  }

  function sendChat(content: string) {
    socketRef.current?.emit('chatMessage', { content });
  }

  function submitModalFn(modalId: string, fields: Record<string, string>) {
    const interactionId = nextInteractionId();
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
    setMessages(prev => [...prev, {
      type: 'system',
      content: `Available commands:\n${lines}`,
      id: nextId(),
    }]);
  }

  async function fetchAutocomplete(cmdName: string, optionName: string, value: string) {
    try {
      const res = await fetch(`/api/commands/${cmdName}/autocomplete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          options: { [optionName]: value },
          focused: { name: optionName, value },
        }),
      });
      return await res.json();
    } catch {
      return [];
    }
  }

  return (
    <SocketContext.Provider value={{
      socket: socketRef.current,
      connected,
      commands,
      messages,
      modal,
      closeModal: () => setModal(null),
      executeCommand,
      sendChat,
      submitModal: submitModalFn,
      sendComponentInteraction,
      fetchAutocomplete,
      showHelp,
    }}>
      {children}
    </SocketContext.Provider>
  );
}
