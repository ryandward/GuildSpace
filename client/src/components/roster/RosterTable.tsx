import RosterRow, { type RosterMember } from './RosterRow';

interface Props {
  members: RosterMember[];
  classFilter?: string | null;
  classAbbreviations?: Record<string, string>;
}

export default function MemberList({ members, classFilter, classAbbreviations }: Props) {
  return (
    <div className="flex flex-col">
      {members.map(m => (
        <RosterRow
          key={m.discordId}
          member={m}
          classFilter={classFilter}
          classAbbreviations={classAbbreviations}
        />
      ))}
    </div>
  );
}
