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
  selected: boolean;
  onSelect: () => void;
}

export default function RosterRow({ member, classFilter, selected, onSelect }: Props) {
  const featured = classFilter
    ? member.characters.find(c => c.class === classFilter) || member.characters[0]
    : member.characters.find(c => c.status === 'Main') || member.characters[0];

  const featuredClass = featured?.class || '';
  const featuredName = featured?.name || member.displayName;
  const featuredLevel = featured?.level || 0;
  const netDkp = member.earnedDkp - member.spentDkp;
  const initial = featuredName.charAt(0).toUpperCase();

  return (
    <div className={`roster-tile${selected ? ' selected' : ''}`} onClick={onSelect}>
      {/* Collapsed: avatar tile */}
      <div className="roster-tile-face">
        <div className={`roster-avatar ${classToPip(featuredClass)}`}>
          <span>{initial}</span>
        </div>
        <div className="roster-tile-name">{featuredName}</div>
        <div className="roster-tile-class">{featuredClass} {featuredLevel}</div>
      </div>

      {/* Expanded: full profile */}
      {selected && (
        <div className="roster-tile-detail">
          <div className="roster-tile-player">{member.displayName}</div>
          <div className="roster-tile-dkp">
            <span className="dkp-net">{netDkp}</span> DKP
            <span className="dkp-breakdown">({member.earnedDkp} earned, {member.spentDkp} spent)</span>
          </div>
          <div className="roster-tile-chars">
            {member.characters.map(c => (
              <div className="roster-tile-char" key={c.name}>
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
      )}
    </div>
  );
}
