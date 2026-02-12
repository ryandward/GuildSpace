import RosterRow, { type RosterMember } from './RosterRow';

interface RosterGridProps {
  members: RosterMember[];
  classFilter?: string | null;
  selectedMember: string | null;
  onSelectMember: (id: string) => void;
}

export default function RosterGrid({ members, classFilter, selectedMember, onSelectMember }: RosterGridProps) {
  return (
    <div className="roster-grid">
      {members.map(m => (
        <RosterRow
          key={m.discordId}
          member={m}
          classFilter={classFilter}
          selected={selectedMember === m.discordId}
          onSelect={() => onSelectMember(m.discordId)}
        />
      ))}
    </div>
  );
}
