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

interface Props {
  member: RosterMember;
  classFilter?: string | null;
}

export default function RosterRow({ member, classFilter }: Props) {
  const featured = classFilter
    ? member.characters.find(c => c.class === classFilter) || member.characters[0]
    : member.characters.find(c => c.status === 'Main') || member.characters[0];

  const featuredName = featured?.name || member.displayName;
  const netDkp = member.earnedDkp - member.spentDkp;

  return (
    <div className="member-profile">
      <div className="member-header">
        <div className="member-identity">
          <span className="member-name">{featuredName}</span>
          <span className="member-player">{member.displayName}</span>
        </div>
        <div className="member-dkp">
          <span className="member-dkp-value">{netDkp}</span>
          <span className="member-dkp-label">DKP</span>
        </div>
      </div>
      <div className="member-chars">
        {member.characters.map(c => (
          <div className={`member-char${classFilter && c.class === classFilter ? ' highlighted' : ''}`} key={c.name}>
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
    </div>
  );
}
