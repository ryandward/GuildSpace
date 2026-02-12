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

  const netDkp = member.earnedDkp - member.spentDkp;

  return (
    <div className="roster-member">
      <div className="roster-member-primary">
        <span className={`roster-member-pip ${classToPip(featured?.class || '')}`} />
        <span className="roster-member-name">{featured?.name || member.displayName}</span>
        <span className="roster-member-class">{featured?.class}</span>
        <span className="roster-member-level">{featured?.level}</span>
        <span className="roster-member-player">{member.displayName}</span>
        <span className="roster-member-dkp">{netDkp}</span>
      </div>
      {member.characters.length > 1 && (
        <div className="roster-member-alts">
          {member.characters.filter(c => c !== featured).map(c => (
            <div
              key={c.name}
              className={`roster-member-alt${classFilter && c.class === classFilter ? ' highlighted' : ''}`}
            >
              <span className={`roster-alt-pip ${classToPip(c.class)}`} />
              <span className="roster-alt-name">{c.name}</span>
              <span className="roster-alt-class">{c.class}</span>
              <span className="roster-alt-level">{c.level}</span>
              <span className={`roster-alt-badge ${c.status.toLowerCase()}`}>{c.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
