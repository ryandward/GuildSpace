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

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

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
    <div className="profile-panel">
      <div className="profile-header">
        <div className="profile-avatar">{initial}</div>
        <div style={{ flex: 1 }}>
          <div className="profile-name">{lines[0]}</div>
          <div className="profile-subtitle">{lines.slice(1).join(' \u00B7 ')}</div>
        </div>
      </div>
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-value chars">{totalChars}</div>
          <div className="stat-label">Characters</div>
        </div>
      </div>
      {groups.map((g, gi) => (
        <div className="char-section" key={gi}>
          <div className="char-section-header">
            {g.status} <span className="count">{g.names.length}</span>
          </div>
          {g.names.map((name, j) => {
            const cn = (g.classes[j] || '').trim();
            return (
              <div className="char-row" key={j}>
                <div className={`char-pip ${classToPip(cn)}`} />
                <div className="char-level">{g.levels[j] || ''}</div>
                <div className="char-info">
                  <div className="char-name">{name}</div>
                  <div className="char-class">{cn}</div>
                </div>
                <div className={`char-badge ${g.status.toLowerCase()}`}>{g.status}</div>
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
    <div className="profile-panel">
      <div className="profile-header">
        <div className="profile-avatar">{initial}</div>
        <div style={{ flex: 1 }}>
          <div className="profile-name">{renderEmoji(embed.title || '')}</div>
          <div className="profile-subtitle">{desc}</div>
        </div>
      </div>
      <div className="stats-row">
        {fields.map((field, i) => {
          const label = renderEmoji(field.name).replace(/[^\w\s]/g, '').trim();
          return (
            <div className="stat-card" key={i}>
              <div className="stat-value dkp">{field.value}</div>
              <div className="stat-label">{label}</div>
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

  return (
    <div className={`embed color-${embed.color || 'Green'}`}>
      {embed.title && <div className="embed-title">{renderEmoji(embed.title)}</div>}
      {embed.description && <div className="embed-description">{cleanText(embed.description)}</div>}
      {fields.length > 0 && (
        <div className="embed-fields">
          {fields.map((field, i) => (
            <div className={`embed-field ${field.inline === false ? 'full-width' : ''}`} key={i}>
              <div className="embed-field-name">{renderEmoji(field.name)}</div>
              <div className="embed-field-value">{cleanText(field.value)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ButtonView({ btn, parentInteractionId }: { btn: { customId: string; label: string; style?: string }; parentInteractionId?: string }) {
  const { sendComponentInteraction } = useSocket();

  return (
    <button
      className={`comp-button style-${btn.style || 'Primary'}`}
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
      className="comp-select"
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
          <div className="components" key={ri}>
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
    <div className="message">
      {data.content && <div className="text-reply">{cleanText(data.content)}</div>}
      {data.embeds?.map((embed, i) => <EmbedView key={i} embed={embed} />)}
      {data.components && <ComponentsView components={data.components} interactionId={data.interactionId} />}
    </div>
  );
}

function ChatMessageView({ msg, isMe }: { msg: { createdAt: string; displayName: string; content: string }; isMe: boolean }) {
  const time = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return (
    <div className="message chat">
      <span className="chat-time">{time}</span>{' '}
      <span className={`chat-name${isMe ? ' chat-me' : ''}`}>{msg.displayName}</span>{' '}
      <span className="chat-text">{msg.content}</span>
    </div>
  );
}

function MessageView({ msg, userId }: { msg: AppMessage; userId?: string }) {
  switch (msg.type) {
    case 'system':
      return <div className="message system">{msg.content}</div>;
    case 'command':
      return <div className="message command">{msg.content}</div>;
    case 'error':
      return <div className="message error">{msg.content}</div>;
    case 'loading':
      return <div className="message system loading">{msg.content}</div>;
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
    <div className="messages">
      {messages.map(msg => (
        <MessageView key={msg.id} msg={msg} userId={user?.id} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
