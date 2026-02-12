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

  // When a class filter is active, feature the matching character instead of the main
  const featured = classFilter
    ? member.characters.find(c => c.class === classFilter) || member.characters[0]
    : member.characters.find(c => c.status === 'Main') || member.characters[0];

  const featuredClass = featured?.class || '';
  const featuredName = featured?.name || member.displayName;
  const featuredLevel = featured?.level || 0;
  const netDkp = member.earnedDkp - member.spentDkp;

  return (
    <div className={`roster-member${expanded ? ' expanded' : ''}`}>
      <div className="roster-member-header" onClick={() => setExpanded(e => !e)}>
        <div className={`char-pip ${classToPip(featuredClass)}`} />
        <div className="roster-col roster-col-name">
          <span className="char-name">{featuredName}</span>
          <span className="char-class">{featuredClass} <span className="roster-player-name">{member.displayName}</span></span>
        </div>
        <div className="roster-col roster-col-level char-level">{featuredLevel}</div>
        <div className="roster-col roster-col-chars">{member.characters.length} char{member.characters.length !== 1 ? 's' : ''}</div>
        <div className="roster-col roster-col-dkp">{netDkp} DKP</div>
        <div className="roster-col roster-col-expand">{expanded ? '\u25B4' : '\u25BE'}</div>
      </div>
      {expanded && (
        <div className="roster-member-chars">
          {member.characters.map(c => (
            <div className="char-row" key={c.name}>
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
