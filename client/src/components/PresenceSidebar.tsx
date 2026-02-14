import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { useRosterQuery } from '../hooks/useRosterQuery';
import { getClassColor, getMostRecentClass } from '../lib/classColors';
import { text } from '../ui/recipes';

interface OnlineMember {
  discordId: string;
  displayName: string;
  classColor: string;
}

export default function PresenceSidebar() {
  const { onlineIds, totalMembers, connected } = useSocket();
  const { user } = useAuth();
  const { data: rosterData } = useRosterQuery();
  const navigate = useNavigate();

  const { me, others } = useMemo(() => {
    if (!rosterData?.members) return { me: null, others: [] };

    const memberMap = new Map(
      rosterData.members.map(m => [m.discordId, m])
    );
    const onlineSet = new Set(onlineIds);

    let me: OnlineMember | null = null;
    const others: OnlineMember[] = [];

    for (const id of onlineSet) {
      const member = memberMap.get(id);
      if (!member) continue;

      const cls = getMostRecentClass(member.characters);
      const classColor = cls ? getClassColor(cls) : getClassColor('');

      if (id === user?.id) {
        // Use auth user's displayName — guaranteed GuildSpace name
        me = {
          discordId: member.discordId,
          displayName: user.displayName,
          classColor,
        };
      } else {
        others.push({
          discordId: member.discordId,
          displayName: member.displayName,
          classColor,
        });
      }
    }

    others.sort((a, b) => a.displayName.localeCompare(b.displayName));

    return { me, others };
  }, [rosterData, onlineIds, user?.id, user?.displayName]);

  if (!connected) return null;

  return (
    <aside className="w-[--container-sidebar] shrink-0 border-r border-border bg-surface flex flex-col max-lg:hidden">
      {/* Online header */}
      <div className="px-2 pt-1.5 pb-0.5">
        <span className={text({ variant: 'overline' })}>
          ONLINE — {others.length + (me ? 1 : 0)}
        </span>
      </div>

      {/* Online members list — me pinned at top */}
      <div className="flex-1 overflow-y-auto">
        {me && (
          <button
            className="flex items-center gap-1.5 px-2 py-1 bg-transparent border-none cursor-pointer text-left hover:bg-surface-2 transition-colors duration-fast w-full"
            onClick={() => navigate(`/roster/${me.discordId}`)}
          >
            <span className="size-0.5 rounded-full bg-green shrink-0" />
            <span
              className="font-body text-caption font-bold truncate"
              style={{ color: me.classColor }}
            >
              {me.displayName}
            </span>
          </button>
        )}
        {others.map(member => (
          <button
            key={member.discordId}
            className="flex items-center gap-1.5 px-2 py-1 bg-transparent border-none cursor-pointer text-left hover:bg-surface-2 transition-colors duration-fast w-full"
            onClick={() => navigate(`/roster/${member.discordId}`)}
          >
            <span className="size-0.5 rounded-full bg-green shrink-0" />
            <span
              className="font-body text-caption truncate"
              style={{ color: member.classColor }}
            >
              {member.displayName}
            </span>
          </button>
        ))}
      </div>

      {/* Footer */}
      {totalMembers > 0 && (
        <div className="px-2 py-1.5 border-t border-border">
          <span className={text({ variant: 'caption' })}>
            {totalMembers} Members
          </span>
        </div>
      )}
    </aside>
  );
}
