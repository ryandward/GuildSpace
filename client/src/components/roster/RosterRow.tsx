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
    <div className="border-b border-border">
      <div className="grid grid-cols-[3px_1fr_80px_28px_100px_54px] items-center gap-2 py-1.5 px-1 transition-colors duration-100 hover:bg-surface max-md:grid-cols-[3px_1fr_28px_48px]">
        <span className={`w-[3px] self-stretch ${classToPip(featured?.class || '')}`} />
        <span className="text-sm font-bold text-text overflow-hidden text-ellipsis whitespace-nowrap">{featured?.name || member.displayName}</span>
        <span className="text-[10px] text-text-dim overflow-hidden text-ellipsis whitespace-nowrap max-md:hidden">{featured?.class}</span>
        <span className="text-xs font-bold text-text-dim text-center">{featured?.level}</span>
        <span className="text-[10px] text-text-dim opacity-40 overflow-hidden text-ellipsis whitespace-nowrap max-md:hidden">{member.displayName}</span>
        <span className="text-xs font-bold text-yellow text-right">{netDkp}</span>
      </div>
      {member.characters.length > 1 && (
        <div className="pl-4">
          {member.characters.filter(c => c !== featured).map(c => (
            <div
              key={c.name}
              className={`grid grid-cols-[2px_1fr_60px_28px_auto] items-center gap-1.5 py-0.5 px-1 transition-colors duration-100 hover:bg-surface ${classFilter && c.class === classFilter ? 'bg-accent/[0.06]' : ''}`}
            >
              <span className={`w-0.5 h-3 ${classToPip(c.class)}`} />
              <span className="text-xs text-text-dim overflow-hidden text-ellipsis whitespace-nowrap">{c.name}</span>
              <span className="text-[9px] text-text-dim opacity-50">{c.class}</span>
              <span className="text-[10px] text-text-dim opacity-50 text-center">{c.level}</span>
              <span className={`text-[8px] font-bold uppercase tracking-wide text-text-dim ${
                c.status.toLowerCase() === 'main' ? 'text-accent' :
                c.status.toLowerCase() === 'alt' ? 'text-green' :
                c.status.toLowerCase() === 'bot' ? 'text-yellow' : ''
              }`}>{c.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
