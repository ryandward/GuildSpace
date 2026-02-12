import { useState } from 'react';

function classToPip(className: string): string {
  return 'pip-' + (className || '').toLowerCase().replace(/\s+/g, '-');
}

export interface RosterCharacter {
  name: string;
  class: string;
  level: number;
  status: string;
}

export interface RosterMember {
  discordId: string;
  displayName: string;
  characters: RosterCharacter[];
  mainName: string | null;
  mainClass: string | null;
  mainLevel: number | null;
  earnedDkp: number;
  spentDkp: number;
}

export default function RosterRow({ member, classFilter }: { member: RosterMember; classFilter?: string | null }) {
  const [expanded, setExpanded] = useState(false);

  const featured = classFilter
    ? member.characters.find(c => c.class === classFilter) || member.characters[0]
    : member.characters.find(c => c.status === 'Main') || member.characters[0];

  const featuredClass = featured?.class || '';
  const featuredName = featured?.name || member.displayName;
  const featuredLevel = featured?.level || 0;
  const netDkp = member.earnedDkp - member.spentDkp;

  return (
    <div
      className={`roster-card${expanded ? ' expanded' : ''}`}
      style={{ '--pip-color': `var(--pip-${featuredClass.toLowerCase().replace(/\s+/g, '-')}-color, var(--text-dim))` } as React.CSSProperties}
    >
      <div className={`roster-card-pip ${classToPip(featuredClass)}`} />
      <div className="roster-card-body" onClick={() => setExpanded(e => !e)}>
        <div className="roster-card-main">
          <div className="roster-card-identity">
            <span className="roster-card-name">{featuredName}</span>
            <span className="roster-card-meta">
              {featuredClass} &middot; {featuredLevel}
              {member.characters.length > 1 && (
                <span className="roster-card-alts"> &middot; {member.characters.length} chars</span>
              )}
            </span>
          </div>
          <div className="roster-card-right">
            <span className="roster-card-dkp">{netDkp}</span>
            <span className="roster-card-dkp-label">DKP</span>
          </div>
        </div>
        <div className="roster-card-player">{member.displayName}</div>
      </div>
      {expanded && (
        <div className="roster-card-chars">
          {member.characters.map(c => (
            <div className="roster-char" key={c.name}>
              <div className={`char-pip ${classToPip(c.class)}`} />
              <div className="char-level">{c.level}</div>
              <div className="char-info">
                <div className="char-name">{c.name}</div>
                <div className="char-class">{c.class}</div>
              </div>
              <div className={`char-badge ${c.status.toLowerCase()}`}>{c.status}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
