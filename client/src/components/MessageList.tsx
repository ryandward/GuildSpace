import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket, type AppMessage, type ReplyData, type Embed, type EmbedField, type Component, type ComponentRow } from '../context/SocketContext';

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

const embedBorderColors: Record<string, string> = {
  Red: 'border-l-red',
  Blue: 'border-l-blue',
  Yellow: 'border-l-yellow',
  Green: 'border-l-green',
};

// --- Sub-components ---

function CensusPanel({ embed }: { embed: Embed }) {
  const desc = renderDiscordMarkdown(embed.description || '');
  const fields = embed.fields || [];

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
    <div className="max-w-[600px] animate-[fadeIn_0.25s_ease]">
      <div className="bg-surface border border-border p-4 px-5 mb-2 flex items-center gap-4">
        <div className="w-12 h-12 bg-surface-2 border-2 border-accent flex items-center justify-center text-lg font-bold text-accent shrink-0">
          {initial}
        </div>
        <div className="flex-1">
          <div className="text-base font-bold text-text leading-tight">{lines[0]}</div>
          <div className="text-xs text-text-dim mt-0.5">{lines.slice(1).join(' \u00B7 ')}</div>
        </div>
      </div>
      <div className="flex gap-1.5 mb-2">
        <div className="bg-surface border border-border py-3 px-4 flex-1 text-center">
          <div className="text-2xl font-bold text-accent leading-none">{totalChars}</div>
          <div className="text-[9px] font-bold uppercase tracking-widest text-text-dim mt-1">Characters</div>
        </div>
      </div>
      {groups.map((g, gi) => (
        <div className="bg-surface border border-border mb-2 last:mb-0 overflow-hidden" key={gi}>
          <div className="py-2.5 px-4 border-b border-border text-[10px] font-bold uppercase tracking-widest text-text-dim flex items-center gap-2">
            {g.status} <span className="bg-surface-2 text-[10px] py-px px-1.5 font-semibold">{g.names.length}</span>
          </div>
          {g.names.map((name, j) => {
            const cn = (g.classes[j] || '').trim();
            const badgeStyle = g.status.toLowerCase();
            return (
              <div className="flex items-center py-2.5 px-4 border-b border-border last:border-b-0 gap-3" key={j}>
                <div className={`w-[3px] h-7 shrink-0 ${classToPip(cn)}`} />
                <div className="text-[15px] font-bold text-text-dim min-w-7 text-center">{g.levels[j] || ''}</div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-text leading-tight">{name}</div>
                  <div className="text-xs text-text-dim">{cn}</div>
                </div>
                <div className={`text-[9px] font-bold uppercase tracking-wide py-0.5 px-2 bg-surface-2 text-text-dim ${
                  badgeStyle === 'main' ? 'bg-accent/10 text-accent' :
                  badgeStyle === 'alt' ? 'bg-green/10 text-green' :
                  badgeStyle === 'bot' ? 'bg-yellow/10 text-yellow' : ''
                }`}>
                  {g.status}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function DkpPanel({ embed }: { embed: Embed }) {
  const desc = renderDiscordMarkdown(embed.description || '');
  const initial = desc.charAt(0).toUpperCase() || '?';
  const fields = embed.fields || [];

  return (
    <div className="max-w-[600px] animate-[fadeIn_0.25s_ease]">
      <div className="bg-surface border border-border p-4 px-5 mb-2 flex items-center gap-4">
        <div className="w-12 h-12 bg-surface-2 border-2 border-accent flex items-center justify-center text-lg font-bold text-accent shrink-0">
          {initial}
        </div>
        <div className="flex-1">
          <div className="text-base font-bold text-text leading-tight">{renderEmoji(embed.title || '')}</div>
          <div className="text-xs text-text-dim mt-0.5">{desc}</div>
        </div>
      </div>
      <div className="flex gap-1.5 mb-2">
        {fields.map((field, i) => {
          const label = renderEmoji(field.name).replace(/[^\w\s]/g, '').trim();
          return (
            <div className="bg-surface border border-border py-3 px-4 flex-1 text-center" key={i}>
              <div className="text-2xl font-bold text-yellow leading-none">{field.value}</div>
              <div className="text-[9px] font-bold uppercase tracking-widest text-text-dim mt-1">{label}</div>
            </div>
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

  const borderColor = embedBorderColors[embed.color || 'Green'] || 'border-l-green';

  return (
    <div className={`bg-surface border-l-3 py-3 px-4 max-w-[600px] ${borderColor}`}>
      {embed.title && <div className="font-bold mb-1.5 text-sm">{renderEmoji(embed.title)}</div>}
      {embed.description && <div className="text-text-dim mb-2.5 text-xs whitespace-pre-wrap">{cleanText(embed.description)}</div>}
      {fields.length > 0 && (
        <div className="flex flex-wrap gap-x-5 gap-y-1">
          {fields.map((field, i) => (
            <div className={`min-w-[120px] mb-2 ${field.inline === false ? 'w-full' : ''}`} key={i}>
              <div className="font-bold text-xs text-text-dim mb-0.5">{renderEmoji(field.name)}</div>
              <div className="text-xs whitespace-pre-wrap">{cleanText(field.value)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ButtonView({ btn, parentInteractionId }: { btn: { customId: string; label: string; style?: string }; parentInteractionId?: string }) {
  const { sendComponentInteraction } = useSocket();

  const styleClasses: Record<string, string> = {
    Success: 'border-green text-green',
    Danger: 'border-red text-red',
    Primary: 'border-accent text-accent',
  };

  return (
    <button
      className={`py-1.5 px-4 border border-border bg-surface-2 text-text font-mono text-xs cursor-pointer hover:bg-border ${styleClasses[btn.style || 'Primary'] || ''}`}
      onClick={() => parentInteractionId && sendComponentInteraction(parentInteractionId, btn.customId)}
    >
      {btn.label}
    </button>
  );
}

function SelectMenuView({ menu, parentInteractionId }: { menu: { customId: string; placeholder?: string; options: { label: string; value: string }[] }; parentInteractionId?: string }) {
  const { sendComponentInteraction } = useSocket();

  return (
    <select
      className="py-1.5 px-3 bg-surface-2 border border-border text-text font-mono text-xs min-w-[200px]"
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
          <div className="flex gap-2 flex-wrap mt-2" key={ri}>
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
    <div className="max-w-[700px] animate-[fadeIn_0.2s_ease]">
      {data.content && <div className="whitespace-pre-wrap">{cleanText(data.content)}</div>}
      {data.embeds?.map((embed, i) => <EmbedView key={i} embed={embed} />)}
      {data.components && <ComponentsView components={data.components} interactionId={data.interactionId} />}
    </div>
  );
}

function ChatMessageView({ msg, isMe }: { msg: { createdAt: string; displayName: string; content: string }; isMe: boolean }) {
  const time = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return (
    <div className="max-w-[700px] animate-[fadeIn_0.2s_ease]">
      <span className="text-text-dim text-xs">{time}</span>{' '}
      <span className={`font-bold ${isMe ? 'text-green' : 'text-accent'}`}>{msg.displayName}</span>{' '}
      <span className="text-text">{msg.content}</span>
    </div>
  );
}

function MessageView({ msg, userId }: { msg: AppMessage; userId?: string }) {
  switch (msg.type) {
    case 'system':
      return <div className="max-w-[700px] animate-[fadeIn_0.2s_ease] text-text-dim italic text-xs">{msg.content}</div>;
    case 'command':
      return <div className="max-w-[700px] animate-[fadeIn_0.2s_ease] text-text-dim text-xs message-command">{msg.content}</div>;
    case 'error':
      return <div className="max-w-[700px] animate-[fadeIn_0.2s_ease] text-red">{msg.content}</div>;
    case 'loading':
      return <div className="max-w-[700px] animate-[fadeIn_0.2s_ease] text-text-dim italic text-xs loading">{msg.content}</div>;
    case 'chat':
      return <ChatMessageView msg={msg.msg} isMe={userId === msg.msg.userId} />;
    case 'reply':
      return <ReplyView data={msg.data} />;
  }
}

export default function MessageList() {
  const { messages } = useSocket();
  const { user } = useAuth();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto py-4 px-5 flex flex-col gap-2.5">
      {messages.map(msg => (
        <MessageView key={msg.id} msg={msg} userId={user?.id} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
