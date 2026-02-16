import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket, type AppMessage } from '../context/SocketContext';
import { Text } from '../ui';
import { text } from '../ui/recipes';
import { cx } from 'class-variance-authority';
import { Link } from 'react-router-dom';
import { CLASS_COLORS } from '../lib/classColors';

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// --- Bubble corner radius helper ---

function bubbleRadius(isMe: boolean, isFirst: boolean, isLast: boolean): string {
  let tl = 'rounded-tl-lg';
  let tr = 'rounded-tr-lg';
  let bl = 'rounded-bl-lg';
  let br = 'rounded-br-lg';

  if (isMe) {
    if (!isFirst) tr = 'rounded-tr-sm';
    br = 'rounded-br-sm';
  } else {
    if (!isFirst) tl = 'rounded-tl-sm';
    bl = 'rounded-bl-sm';
  }

  return `${tl} ${tr} ${bl} ${br}`;
}

// --- Chat bubble ---

function ChatBubble({ msg, isMe, isFirst, isLast, nameClass }: {
  msg: { createdAt: string; displayName: string; content: string; userId: string };
  isMe: boolean;
  isFirst: boolean;
  isLast: boolean;
  nameClass?: string | null;
}) {
  const radius = bubbleRadius(isMe, isFirst, isLast);
  const nameColor = nameClass ? CLASS_COLORS[nameClass] : undefined;

  return (
    <div className={cx(
      'flex flex-col max-w-[75%] animate-fade-in',
      isMe ? 'self-end items-end' : 'self-start items-start',
      isFirst ? 'mt-1.5' : 'mt-px',
    )}>
      {isFirst && (
        <div className={cx(
          'flex items-center gap-1 mb-0.5',
          isMe ? 'flex-row-reverse' : 'flex-row',
        )}>
          <Link
            to={`/roster/${msg.userId}`}
            className={cx(text({ variant: 'body' }), 'font-bold no-underline hover:brightness-125 transition-[color,filter] duration-fast',
              !nameColor && (isMe ? 'text-accent' : 'text-text-secondary'),
            )}
            style={nameColor ? { color: nameColor } : undefined}
          >
            {msg.displayName}
          </Link>
          <Text variant="caption">{formatTime(msg.createdAt)}</Text>
        </div>
      )}
      <div className={cx(
        'px-1.5 py-1',
        radius,
        isMe ? 'bubble-self' : 'bubble-other',
      )}>
        <Text variant="body" className="whitespace-pre-wrap break-words">{msg.content}</Text>
      </div>
    </div>
  );
}

// --- System-style messages (centered) ---

function SystemMessage({ content, variant }: { content: string; variant: 'system' | 'error' }) {
  return (
    <div className="self-center animate-fade-in">
      <Text variant={variant} className="block">
        {content}
      </Text>
    </div>
  );
}

// --- Main list ---

export default function MessageList({ classMap }: { classMap?: Map<string, string> }) {
  const { messages } = useSocket();
  const { user } = useAuth();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto py-2 px-2 flex flex-col">
      {messages.map((msg, i) => {
        switch (msg.type) {
          case 'system':
          case 'error':
            return <SystemMessage key={msg.id} content={msg.content} variant={msg.type} />;
          case 'chat': {
            const isMe = user?.id === msg.msg.userId;
            const prev = messages[i - 1];
            const next = messages[i + 1];
            const isFirst = !prev || prev.type !== 'chat' || prev.msg.userId !== msg.msg.userId;
            const isLast = !next || next.type !== 'chat' || next.msg.userId !== msg.msg.userId;
            return (
              <ChatBubble
                key={msg.id}
                msg={msg.msg}
                isMe={isMe}
                isFirst={isFirst}
                isLast={isLast}
                nameClass={classMap?.get(msg.msg.userId)}
              />
            );
          }
        }
      })}
      <div ref={bottomRef} />
    </div>
  );
}
