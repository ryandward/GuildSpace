import { Link } from 'react-router-dom';
import { useRosterQuery } from '../hooks/useRosterQuery';
import { getClassColor, getMostRecentClass } from '../lib/classColors';
import { text } from '../ui/recipes';

export default function DmHeader({ userId }: { userId: string }) {
  const { data: rosterData } = useRosterQuery();
  const member = rosterData?.members.find(m => m.discordId === userId);
  const displayName = member?.displayName || userId;
  const cls = member ? getMostRecentClass(member.characters) : null;
  const nameColor = cls ? getClassColor(cls) : undefined;

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 border-b border-border bg-surface">
      <Link
        to="/chat"
        className="text-text-dim hover:text-text no-underline transition-colors duration-fast font-body text-body"
        aria-label="Back to chat"
      >
        &larr;
      </Link>
      <span className={text({ variant: 'overline' })}>DM</span>
      <span
        className="font-body text-body font-bold truncate"
        style={nameColor ? { color: nameColor } : undefined}
      >
        {displayName}
      </span>
    </div>
  );
}
