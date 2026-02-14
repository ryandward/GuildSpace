import { Link } from 'react-router-dom';
import { Badge, Text } from '../../ui';
import type { CallDetail, EventMember } from '../../hooks/useEventDetailQuery';
import { getClassColor } from '../../lib/classColors';
import { isBadgeRole, ROLE_COLOR, ROLE_LABEL } from '../../lib/roles';

interface Props {
  calls: CallDetail[];
  members: EventMember[];
}

export default function AttendanceMatrix({ calls, members }: Props) {
  return (
    <div className="border-t border-border overflow-x-auto">
      <table className="w-full border-collapse text-caption">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-1 px-2 font-bold text-text-dim text-micro uppercase tracking-overline whitespace-nowrap">Name</th>
            {calls.map((call, idx) => (
              <th
                key={call.id}
                className="text-center py-1 px-1 font-bold text-text-dim text-micro uppercase tracking-overline whitespace-nowrap max-md:hidden"
                title={`${call.raidName} (${call.modifier} DKP)`}
              >
                #{idx + 1}
              </th>
            ))}
            <th className="text-center py-1 px-1 font-bold text-text-dim text-micro uppercase tracking-overline whitespace-nowrap md:hidden">
              Calls
            </th>
            <th className="text-right py-1 px-2 font-bold text-text-dim text-micro uppercase tracking-overline whitespace-nowrap">Total</th>
          </tr>
        </thead>
        <tbody>
          {members.map(member => (
            <tr key={member.discordId} className="border-b border-border-subtle hover:bg-surface-2 transition-colors duration-fast">
              <td className="py-1 px-2 whitespace-nowrap">
                <Link to={`/roster/${member.discordId}`} className="no-underline">
                  <span
                    className="font-body text-caption font-medium hover:brightness-125 transition-[color,filter] duration-fast inline-flex items-center gap-1"
                    style={member.mainClass ? { color: getClassColor(member.mainClass) } : undefined}
                  >
                    {member.displayName}
                    {member.hasGuildSpace && <span className="inline-block size-1 rounded-full bg-accent shrink-0" title="GuildSpace member" />}
                    {isBadgeRole(member.role) && <Badge variant="count" color={ROLE_COLOR[member.role]}>{ROLE_LABEL[member.role]}</Badge>}
                  </span>
                </Link>
              </td>
              {calls.map(call => {
                const present = member.callsPresent.includes(call.id);
                return (
                  <td key={call.id} className="text-center py-1 px-1 max-md:hidden">
                    {present ? (
                      <span className="inline-block size-1 rounded-full bg-green" />
                    ) : (
                      <span className="text-text-dim">—</span>
                    )}
                  </td>
                );
              })}
              <td className="text-center py-1 px-1 md:hidden">
                <Text variant="mono">{member.callsPresent.length}/{calls.length}</Text>
              </td>
              <td className="text-right py-1 px-2">
                <Text variant="mono" className="font-bold">{member.totalDkp}</Text>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
