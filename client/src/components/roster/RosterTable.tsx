import { useState, useCallback } from 'react';
import RosterRow, { type RosterMember } from './RosterRow';

interface Props {
  members: RosterMember[];
  classFilter?: string | null;
}

export default function MemberList({ members, classFilter }: Props) {
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set());

  const toggleMember = useCallback((id: string) => {
    setExpandedMembers(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  return (
    <div className="grid grid-cols-[3px_auto_auto_32px_minmax(0,1fr)_56px_24px] max-md:grid-cols-[3px_minmax(0,1fr)_32px_48px_24px] gap-x-1.5">
      {members.map(m => (
        <RosterRow
          key={m.discordId}
          member={m}
          classFilter={classFilter}
          expanded={expandedMembers.has(m.discordId)}
          onToggle={() => toggleMember(m.discordId)}
        />
      ))}
    </div>
  );
}
