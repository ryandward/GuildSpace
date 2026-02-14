import { useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { useAuth } from '../context/AuthContext';
import { useEventDetailQuery } from '../hooks/useEventDetailQuery';
import { useRaidTemplatesQuery } from '../hooks/useRaidTemplatesQuery';
import { useAddCallMutation, useDeleteCallMutation, useEditCallMutation, useCloseEventMutation, useReopenEventMutation, useAddCharacterMutation, useRemoveCharacterMutation, useReorderCallsMutation } from '../hooks/useRaidMutations';
import type { AddCallResult } from '../hooks/useRaidMutations';
import AddCallForm from '../components/raids/AddCallForm';
import CallRow from '../components/raids/CallRow';
import AttendanceMatrix from '../components/raids/AttendanceMatrix';
import { Button, Card, Text, Heading, Badge } from '../ui';
import { text } from '../ui/recipes';

export default function RaidEventPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { user } = useAuth();
  const { data, isLoading, error } = useEventDetailQuery(eventId);
  const { data: templates } = useRaidTemplatesQuery();
  const addCall = useAddCallMutation(Number(eventId));
  const deleteCall = useDeleteCallMutation(Number(eventId));
  const editCall = useEditCallMutation(Number(eventId));
  const closeEvent = useCloseEventMutation(Number(eventId));
  const reopenEvent = useReopenEventMutation(Number(eventId));
  const addCharacter = useAddCharacterMutation(Number(eventId));
  const removeCharacter = useRemoveCharacterMutation(Number(eventId));
  const reorderCalls = useReorderCallsMutation(Number(eventId));

  const [showAddCall, setShowAddCall] = useState(false);
  const [lastResult, setLastResult] = useState<AddCallResult | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !data || active.id === over.id) return;
    const calls = data.calls;
    const fromIdx = calls.findIndex(c => c.id === active.id);
    const toIdx = calls.findIndex(c => c.id === over.id);
    if (fromIdx === -1 || toIdx === -1) return;
    const reordered = [...calls];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    reorderCalls.mutate(reordered.map(c => c.id));
  }, [data, reorderCalls]);

  const isOfficer = user?.isOfficer;
  const isActive = data?.event.status === 'active';

  function handleAddCall(params: { raidName: string; modifier: number; whoLog: string }) {
    addCall.mutate(params, {
      onSuccess: (result) => {
        setLastResult(result);
        setShowAddCall(false);
      },
    });
  }

  function handleDeleteCall(callId: number) {
    deleteCall.mutate(callId, {
      onSuccess: () => setConfirmDeleteId(null),
    });
  }

  function handleEditCall(callId: number, raidName: string, modifier: number) {
    editCall.mutate({ callId, raidName, modifier });
  }

  function handleCloseEvent() {
    closeEvent.mutate(undefined, {
      onSuccess: () => setConfirmClose(false),
    });
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-content mx-auto py-3 px-3 pb-8 w-full flex flex-col gap-2 max-md:px-1.5 max-md:py-1.5 max-md:pb-14">
          <Link to="/raids" className="no-underline">
            <Text variant="caption" className="hover:text-text">&larr; Back to raids</Text>
          </Link>

          {error && <Text variant="error">Failed to load event</Text>}
          {isLoading && <Text variant="caption" className="py-6 text-center block">Loading...</Text>}

          {data && (
            <>
              {/* Header */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 min-w-0">
                  <Heading level="heading" className="truncate">{data.event.name}</Heading>
                  <Badge variant="status" color={isActive ? 'green' : 'dim'}>{data.event.status}</Badge>
                </div>
                {isOfficer && isActive && (
                  <div className="flex items-center gap-1 shrink-0">
                    {!confirmClose ? (
                      <Button intent="ghost" size="sm" onClick={() => setConfirmClose(true)}>
                        Close Event
                      </Button>
                    ) : (
                      <>
                        <Button intent="danger" size="sm" onClick={handleCloseEvent} disabled={closeEvent.isPending}>
                          {closeEvent.isPending ? 'Closing...' : 'Confirm Close'}
                        </Button>
                        <Button intent="ghost" size="sm" onClick={() => setConfirmClose(false)}>
                          Cancel
                        </Button>
                      </>
                    )}
                  </div>
                )}
                {isOfficer && !isActive && (
                  <Button
                    intent="primary"
                    size="sm"
                    onClick={() => reopenEvent.mutate()}
                    disabled={reopenEvent.isPending}
                  >
                    {reopenEvent.isPending ? 'Reopening...' : 'Reopen Event'}
                  </Button>
                )}
              </div>

              {/* Calls Section */}
              <Card>
                <div className="flex items-center justify-between py-1 px-2 min-h-6">
                  <span className={text({ variant: 'overline' })}>CALLS ({data.calls.length})</span>
                  {isOfficer && isActive && !showAddCall && (
                    <Button intent="primary" size="xs" onClick={() => setShowAddCall(true)}>
                      Add Call +
                    </Button>
                  )}
                </div>

                {showAddCall && (
                  <div className="border-t border-border">
                    <AddCallForm
                      templates={templates || []}
                      onSubmit={handleAddCall}
                      onCancel={() => setShowAddCall(false)}
                      isPending={addCall.isPending}
                    />
                  </div>
                )}

                {lastResult && (
                  <div className="border-t border-border px-2 py-1 bg-surface-2 animate-fade-in">
                    <Text variant="caption">
                      Recorded {lastResult.recorded}, rejected {lastResult.rejected}
                      {lastResult.rejectedPlayers.length > 0 && (
                        <span className="text-text-dim"> — {lastResult.rejectedPlayers.map(r => r.name).join(', ')}</span>
                      )}
                    </Text>
                    <button
                      className="bg-transparent border-none cursor-pointer ml-1"
                      onClick={() => setLastResult(null)}
                    >
                      <Text variant="caption" className="hover:text-red">dismiss</Text>
                    </button>
                  </div>
                )}

                {addCall.isError && (
                  <div className="border-t border-border px-2 py-1">
                    <Text variant="error">Failed to add call</Text>
                  </div>
                )}

                {data.calls.length === 0 && !showAddCall && (
                  <div className="border-t border-border px-2 py-2">
                    <Text variant="caption" className="text-center block">No calls yet</Text>
                  </div>
                )}

                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  modifiers={[restrictToVerticalAxis]}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext items={data.calls.map(c => c.id)} strategy={verticalListSortingStrategy}>
                    {data.calls.map((call, idx) => (
                      <CallRow
                        key={call.id}
                        call={call}
                        index={idx + 1}
                        isOfficer={!!isOfficer}
                        isActive={isActive}
                        confirmDeleteId={confirmDeleteId}
                        onConfirmDelete={setConfirmDeleteId}
                        onDelete={handleDeleteCall}
                        isDeleting={deleteCall.isPending}
                        eventId={Number(eventId)}
                        onAddCharacter={(callId, name) => addCharacter.mutate({ callId, characterName: name })}
                        onRemoveCharacter={(callId, name) => removeCharacter.mutate({ callId, characterName: name })}
                        onEditCall={handleEditCall}
                        isEditPending={editCall.isPending}
                        templates={templates}
                        sortable={!!isOfficer && isActive}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </Card>

              {/* Attendance Matrix */}
              <Card>
                <div className="py-1 px-2 min-h-6">
                  <span className={text({ variant: 'overline' })}>ATTENDANCE ({data.members.length} members)</span>
                </div>
                {data.members.length === 0 ? (
                  <div className="border-t border-border px-2 py-2">
                    <Text variant="caption" className="text-center block">No attendance recorded</Text>
                  </div>
                ) : (
                  <AttendanceMatrix calls={data.calls} members={data.members} />
                )}
              </Card>
            </>
          )}
        </div>
      </div>
  );
}
