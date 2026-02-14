import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket, type AppMessage, type ReplyData, type Embed, type EmbedField, type Component, type ComponentRow } from '../context/SocketContext';
import { Button, Card, Badge, Text } from '../ui';
import { text, embedCard, input, badge, heading, card } from '../ui/recipes';
import { cx } from 'class-variance-authority';

const emojiMap: Record<string, string> = {
  ':busts_in_silhouette:': '\u{1F465}', ':bust_in_silhouette:': '\u{1F464}',
  ':crossed_swords:': '\u2694\uFE0F', ':arrow_double_up:': '\u23EB', ':arrow_up:': '\u2B06\uFE0F',
  ':white_check_mark:': '\u2705', ':x:': '\u274C', ':bank:': '\u{1F3E6}',
  ':mag:': '\u{1F50D}', ':money_bag:': '\u{1F4B0}', ':moneybag:': '\u{1F4B0}',
  ':dragon:': '\u{1F409}', ':question:': '\u2753',
};

function renderEmoji(text: string): string {
  let result = text || '';
  for (const [code, emoji] of Object.entries(emojiMap)) {
    result = result.replaceAll(code, emoji);
  }
  return result;
}

function renderDiscordMarkdown(text: string): string {
  if (!text) return '';
  return text
    .replace(/<@!?\d+>/g, '@user')
    .replace(/<@&\d+>/g, '@role')
    .replace(/<t:\d+:?[a-zA-Z]?>/g, new Date().toLocaleString())
    .replace(/`([^`]+)`/g, '$1');
}

function cleanText(text: string): string {
  return renderEmoji(renderDiscordMarkdown(text));
}

function classToPip(className: string): string {
  return 'pip-' + (className || '').toLowerCase().replace(/\s+/g, '-');
}

function isCensusEmbed(fields: EmbedField[]): boolean {
  if (fields.length < 4) return false;
  for (let i = 0; i < fields.length; i += 4) {
    if (i + 3 >= fields.length) return false;
    if (fields[i].inline !== false) return false;
  }
  return true;
}

function isDkpEmbed(fields: EmbedField[]): boolean {
  return fields.length <= 3 && fields.every(f => f.inline !== false && !isNaN(Number(f.value)));
}

const embedBorderMap: Record<string, 'red' | 'blue' | 'yellow' | 'green'> = {
  Red: 'red',
  Blue: 'blue',
  Yellow: 'yellow',
  Green: 'green',
};

function statusBadgeColor(status: string): 'accent' | 'green' | 'yellow' | 'dim' {
  switch (status.toLowerCase()) {
    case 'main': return 'accent';
    case 'alt': return 'green';
    case 'bot': return 'yellow';
    default: return 'dim';
  }
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// --- Bubble corner radius helper ---

function bubbleRadius(isMe: boolean, isFirst: boolean, isLast: boolean): string {
  // Base: all corners lg (12px). Connecting sides get sm (4px).
  // Tail corner (bl for incoming, br for outgoing) is always sharp.
  let tl = 'rounded-tl-lg';
  let tr = 'rounded-tr-lg';
  let bl = 'rounded-bl-lg';
  let br = 'rounded-br-lg';

  if (isMe) {
    // Outgoing: right side chains, bottom-right is the tail
    if (!isFirst) tr = 'rounded-tr-sm';
    br = 'rounded-br-sm'; // tail — always sharp
  } else {
    // Incoming: left side chains, bottom-left is the tail
    if (!isFirst) tl = 'rounded-tl-sm';
    bl = 'rounded-bl-sm'; // tail — always sharp
  }

  return `${tl} ${tr} ${bl} ${br}`;
}

// --- Sub-components ---

function CensusPanel({ embed }: { embed: Embed }) {
  const desc = renderDiscordMarkdown(embed.description || '');
  const fields = embed.fields || [];
  const [expanded, setExpanded] = useState(false);

  const groups: { status: string; names: string[]; classes: string[]; levels: string[] }[] = [];
  let totalChars = 0;

  for (let i = 0; i < fields.length; i += 4) {
    const names = fields[i + 1]?.value?.split('\n') || [];
    const classes = fields[i + 2]?.value?.split('\n') || [];
    const levels = fields[i + 3]?.value?.split('\n') || [];
    totalChars += names.length;
    groups.push({ status: fields[i].name, names, classes, levels });
  }

  const initial = desc.charAt(0).toUpperCase() || '?';
  const lines = desc.split('\n');

  return (
    <div className="max-w-embed animate-fade-in">
      <Card className="p-2 px-2.5 mb-1 flex items-center gap-2">
        <div className="w-6 h-6 bg-surface-2 border-2 border-accent rounded-md flex items-center justify-center shrink-0">
          <span className={heading({ level: 'subheading' })}>{initial}</span>
        </div>
        <div className="flex-1">
          <span className={cx(text({ variant: 'body' }), 'font-bold leading-tight')}>{lines[0]}</span>
          <span className={cx(text({ variant: 'caption' }), 'mt-0.5 block')}>{lines.slice(1).join(' \u00B7 ')}</span>
        </div>
      </Card>

      <button
        className={cx(card(), 'w-full py-1.5 px-2 mb-1 flex items-center gap-1.5 cursor-pointer hover:bg-surface-2 transition-colors duration-fast')}
        onClick={() => setExpanded(e => !e)}
      >
        <span className="collapse-chevron text-text-dim text-caption" data-expanded={expanded}>›</span>
        <span className={cx(heading({ level: 'display' }), 'font-mono tabular-nums leading-none')}>{totalChars}</span>
        <span className={text({ variant: 'overline' })}>Characters</span>
      </button>

      <div className="collapse-container" data-expanded={expanded}>
        <div className="collapse-inner">
          {groups.map((g, gi) => (
            <Card className="mb-1 last:mb-0 overflow-hidden" key={gi}>
              <div className={cx(text({ variant: 'overline' }), 'py-1 px-2 border-b border-border flex items-center gap-1')}>
                {g.status} <Badge variant="count">{g.names.length}</Badge>
              </div>
              {g.names.map((name, j) => {
                const cn = (g.classes[j] || '').trim();
                return (
                  <div className="flex items-center py-1 px-2 border-b border-border-subtle last:border-b-0 gap-1.5" key={j}>
                    <div className={`w-0.5 h-3.5 shrink-0 rounded-full ${classToPip(cn)}`} />
                    <span className={cx(text({ variant: 'mono' }), 'font-bold min-w-3.5 text-center text-text-dim')}>{g.levels[j] || ''}</span>
                    <div className="flex-1">
                      <span className={cx(text({ variant: 'body' }), 'font-semibold leading-tight')}>{name}</span>
                      <span className={cx(text({ variant: 'caption' }), 'block')}>{cn}</span>
                    </div>
                    <Badge variant="status" color={statusBadgeColor(g.status)}>{g.status}</Badge>
                  </div>
                );
              })}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function DkpPanel({ embed }: { embed: Embed }) {
  const desc = renderDiscordMarkdown(embed.description || '');
  const initial = desc.charAt(0).toUpperCase() || '?';
  const fields = embed.fields || [];

  return (
    <div className="max-w-embed animate-fade-in">
      <Card className="p-2 px-2.5 mb-1 flex items-center gap-2">
        <div className="w-6 h-6 bg-surface-2 border-2 border-accent rounded-md flex items-center justify-center shrink-0">
          <span className={heading({ level: 'subheading' })}>{initial}</span>
        </div>
        <div className="flex-1">
          <span className={cx(text({ variant: 'body' }), 'font-bold leading-tight')}>{renderEmoji(embed.title || '')}</span>
          <span className={cx(text({ variant: 'caption' }), 'mt-0.5 block')}>{desc}</span>
        </div>
      </Card>
      <div className="flex gap-1 mb-1">
        {fields.map((field, i) => {
          const label = renderEmoji(field.name).replace(/[^\w\s]/g, '').trim();
          return (
            <Card className="py-1.5 px-2 flex-1 text-center" key={i}>
              <span className={cx(heading({ level: 'display' }), 'leading-none font-mono tabular-nums text-yellow block')}>{field.value}</span>
              <span className={cx(text({ variant: 'overline' }), 'mt-0.5 block')}>{label}</span>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function EmbedView({ embed }: { embed: Embed }) {
  const fields = embed.fields || [];

  if (fields.length > 0 && isCensusEmbed(fields)) {
    return <CensusPanel embed={embed} />;
  }
  if (fields.length > 0 && isDkpEmbed(fields)) {
    return <DkpPanel embed={embed} />;
  }

  const borderColor = embedBorderMap[embed.color || 'Green'] || 'green';

  return (
    <div className={embedCard({ color: borderColor })}>
      {embed.title && <span className={cx(text({ variant: 'body' }), 'font-bold mb-1 block')}>{renderEmoji(embed.title)}</span>}
      {embed.description && <span className={cx(text({ variant: 'caption' }), 'mb-1.5 block whitespace-pre-wrap')}>{cleanText(embed.description)}</span>}
      {fields.length > 0 && (
        <div className="flex flex-wrap gap-x-2.5 gap-y-0.5">
          {fields.map((field, i) => (
            <div className={`min-w-15 mb-1 ${field.inline === false ? 'w-full' : ''}`} key={i}>
              <span className={cx(text({ variant: 'caption' }), 'font-bold mb-0.5 block')}>{renderEmoji(field.name)}</span>
              <span className={cx(text({ variant: 'caption' }), 'whitespace-pre-wrap block text-text')}>{cleanText(field.value)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ButtonView({ btn, parentInteractionId }: { btn: { customId: string; label: string; style?: string }; parentInteractionId?: string }) {
  const { sendComponentInteraction } = useSocket();

  const intentMap: Record<string, 'success' | 'danger' | 'primary'> = {
    Success: 'success',
    Danger: 'danger',
    Primary: 'primary',
  };

  return (
    <Button
      intent={intentMap[btn.style || 'Primary'] || 'component'}
      size="md"
      onClick={() => parentInteractionId && sendComponentInteraction(parentInteractionId, btn.customId)}
    >
      {btn.label}
    </Button>
  );
}

function SelectMenuView({ menu, parentInteractionId }: { menu: { customId: string; placeholder?: string; options: { label: string; value: string }[] }; parentInteractionId?: string }) {
  const { sendComponentInteraction } = useSocket();

  return (
    <select
      className={cx(input({ variant: 'surface', size: 'md' }), 'min-w-25')}
      defaultValue=""
      onChange={e => parentInteractionId && sendComponentInteraction(parentInteractionId, menu.customId, [e.target.value])}
    >
      <option value="" disabled>{menu.placeholder || 'Select...'}</option>
      {menu.options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

function ComponentsView({ components, interactionId }: { components: (ComponentRow | Component[] | Component)[]; interactionId?: string }) {
  return (
    <>
      {components.map((row, ri) => {
        const items: Component[] = Array.isArray(row)
          ? row
          : ('components' in row && row.components) ? row.components : [row as Component];

        return (
          <div className="flex gap-1 flex-wrap mt-1" key={ri}>
            {items.map((comp, ci) => {
              if (comp.type === 'button') {
                return <ButtonView key={ci} btn={comp} parentInteractionId={interactionId} />;
              }
              if (comp.type === 'select') {
                return <SelectMenuView key={ci} menu={comp} parentInteractionId={interactionId} />;
              }
              return null;
            })}
          </div>
        );
      })}
    </>
  );
}

function ReplyView({ data }: { data: ReplyData }) {
  return (
    <div className="max-w-message animate-fade-in self-center">
      {data.content && <Text variant="body" className="whitespace-pre-wrap block">{cleanText(data.content)}</Text>}
      {data.embeds?.map((embed, i) => <EmbedView key={i} embed={embed} />)}
      {data.components && <ComponentsView components={data.components} interactionId={data.interactionId} />}
    </div>
  );
}

// --- Chat bubble ---

import { Link } from 'react-router-dom';
import { CLASS_COLORS } from '../lib/classColors';

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

function SystemMessage({ content, variant }: { content: string; variant: 'system' | 'command' | 'error' | 'loading' }) {
  const variantMap = {
    system: 'system' as const,
    command: 'command' as const,
    error: 'error' as const,
    loading: 'system' as const,
  };

  return (
    <div className="self-center animate-fade-in">
      <Text variant={variantMap[variant]} className={cx('block', variant === 'loading' && 'loading')}>
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
          case 'loading':
            return <SystemMessage key={msg.id} content={msg.content} variant={msg.type} />;
          case 'command':
            return <SystemMessage key={msg.id} content={msg.content} variant="command" />;
          case 'reply':
            return <ReplyView key={msg.id} data={msg.data} />;
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
