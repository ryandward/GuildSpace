import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useEventsQuery } from '../hooks/useEventsQuery';
import { useCreateEventMutation } from '../hooks/useRaidMutations';
import AppHeader from '../components/AppHeader';
import EventCard from '../components/raids/EventCard';
import { Button, Card, Text, Heading, Input } from '../ui';

export default function RaidsPage() {
  const { user } = useAuth();
  const { data: events, isLoading, error } = useEventsQuery();
  const createEvent = useCreateEventMutation();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');

  const isOfficer = user?.isOfficer;

  function handleCreate() {
    if (!newName.trim()) return;
    createEvent.mutate(newName.trim(), {
      onSuccess: () => {
        setNewName('');
        setShowCreate(false);
      },
    });
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden grain-overlay">
      <AppHeader />
      <div className="flex-1 overflow-y-auto relative z-0">
        <div className="max-w-content mx-auto py-3 px-3 pb-8 w-full flex flex-col gap-2 max-md:px-1.5 max-md:py-1.5 max-md:pb-5">
          <div className="flex items-center justify-between">
            <Heading level="heading">Raids</Heading>
            {isOfficer && !showCreate && (
              <Button intent="primary" size="sm" onClick={() => setShowCreate(true)}>
                Create Event
              </Button>
            )}
          </div>

          {showCreate && (
            <Card className="p-2 animate-fade-in">
              <form
                onSubmit={(e) => { e.preventDefault(); handleCreate(); }}
                className="flex items-center gap-1"
              >
                <Input
                  size="sm"
                  type="text"
                  placeholder="Event name (e.g. HoT Night)"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="flex-1"
                  autoFocus
                />
                <Button intent="primary" size="sm" type="submit" disabled={createEvent.isPending || !newName.trim()}>
                  {createEvent.isPending ? 'Creating...' : 'Create'}
                </Button>
                <Button intent="ghost" size="sm" onClick={() => { setShowCreate(false); setNewName(''); }}>
                  Cancel
                </Button>
              </form>
              {createEvent.isError && (
                <Text variant="error" className="mt-1">Failed to create event</Text>
              )}
            </Card>
          )}

          {error && <Text variant="error">Failed to load events</Text>}
          {isLoading && <Text variant="caption" className="py-6 text-center block">Loading...</Text>}

          {!isLoading && events && events.length === 0 && (
            <Text variant="caption" className="py-6 text-center block">
              No raid events yet.{isOfficer ? ' Create one to get started.' : ''}
            </Text>
          )}

          {events && events.map(event => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      </div>
    </div>
  );
}
