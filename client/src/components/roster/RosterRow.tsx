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

export default function RosterRow({ member }: { member: RosterMember }) {
  const [expanded, setExpanded] = useState(false);

  const mainClass = member.mainClass || member.characters[0]?.class || '';
  const mainName = member.mainName || member.characters[0]?.name || member.displayName;
  const mainLevel = member.mainLevel || member.characters[0]?.level || 0;
  const netDkp = member.earnedDkp - member.spentDkp;

  return (
    <div className={`roster-member${expanded ? ' expanded' : ''}`}>
      <div className="roster-member-header" onClick={() => setExpanded(e => !e)}>
        <div className={`char-pip ${classToPip(mainClass)}`} />
        <div className="roster-col roster-col-name">
          <span className="char-name">{mainName}</span>
          <span className="char-class">{mainClass}</span>
        </div>
        <div className="roster-col roster-col-level char-level">{mainLevel}</div>
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
