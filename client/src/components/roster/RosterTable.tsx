import RosterRow, { type RosterMember } from './RosterRow';

interface Props {
  members: RosterMember[];
  classFilter?: string | null;
}

export default function MemberList({ members, classFilter }: Props) {
  return (
    <div className="member-list">
      {members.map(m => (
        <RosterRow key={m.discordId} member={m} classFilter={classFilter} />
      ))}
    </div>
  );
}
