import { Link } from 'react-router-dom';
import { Card, Badge, Text } from '../../ui';
import type { RaidEventSummary } from '../../hooks/useEventsQuery';

function relativeTime(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

export default function EventCard({ event }: { event: RaidEventSummary }) {
  const isActive = event.status === 'active';

  return (
    <Link to={`/raids/${event.id}`} className="no-underline block">
      <Card className="p-2 hover:bg-surface-2 transition-colors duration-fast cursor-pointer min-h-6">
        <div className="flex items-center gap-2 max-md:flex-col max-md:items-start max-md:gap-1">
          <div className="flex items-center gap-1 min-w-0 max-md:w-full">
            {isActive && <span className="size-1 rounded-full bg-green animate-pulse-slow shrink-0" />}
            <Text variant="body" className="font-bold truncate">{event.name}</Text>
            <Text variant="caption" className="shrink-0 ml-auto md:hidden">{relativeTime(event.createdAt)}</Text>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Text variant="caption" className="max-md:hidden">{relativeTime(event.createdAt)}</Text>
            <Badge variant="count">{event.callCount} calls</Badge>
            <Badge variant="count" color="accent">{event.totalDkp} DKP</Badge>
            <Badge variant="count">{event.memberCount} members</Badge>
            <Badge
              variant="status"
              color={isActive ? 'green' : 'dim'}
            >
              {event.status}
            </Badge>
          </div>
        </div>
      </Card>
    </Link>
  );
}
