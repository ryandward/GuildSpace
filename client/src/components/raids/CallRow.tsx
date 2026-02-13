import { useState } from 'react';
import { Button, Badge, Text, Input } from '../../ui';
import type { CallDetail } from '../../hooks/useEventDetailQuery';

interface Props {
  call: CallDetail;
  index: number;
  isOfficer: boolean;
  isActive: boolean;
  confirmDeleteId: number | null;
  onConfirmDelete: (id: number | null) => void;
  onDelete: (callId: number) => void;
  isDeleting: boolean;
  eventId: number;
  onAddCharacter: (callId: number, name: string) => void;
  onRemoveCharacter: (callId: number, name: string) => void;
}

export default function CallRow({
  call, index, isOfficer, isActive,
  confirmDeleteId, onConfirmDelete, onDelete, isDeleting,
  onAddCharacter, onRemoveCharacter,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [addName, setAddName] = useState('');

  const isConfirmingDelete = confirmDeleteId === call.id;

  return (
    <div className="border-t border-border">
      <button
        className="w-full flex items-center gap-1 py-1 px-2 min-h-6 bg-transparent border-none cursor-pointer text-left hover:bg-surface-2 transition-colors duration-fast"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="collapse-chevron text-text-dim text-caption" data-expanded={expanded}>
          ›
        </span>
        <Text variant="body" className="font-mono text-text-dim w-4 shrink-0">{index}.</Text>
        <Text variant="body" className="font-bold flex-1 truncate">{call.raidName}</Text>
        <Badge variant="count" color="accent">{call.modifier} DKP</Badge>
        <Badge variant="count">{call.recordedCount} recorded</Badge>
      </button>

      {expanded && (
        <div className="px-2 pb-1.5 animate-fade-in">
          {/* Attendees list */}
          {call.attendees.length > 0 && (
            <div className="flex flex-wrap gap-0.5 mb-1">
              {call.attendees.map(a => (
                <span key={a.characterName} className="inline-flex items-center gap-0.5">
                  <Badge variant="count">{a.characterName}</Badge>
                  {isOfficer && isActive && (
                    <button
                      className="bg-transparent border-none cursor-pointer text-text-dim hover:text-red text-micro leading-none p-0"
                      onClick={() => onRemoveCharacter(call.id, a.characterName)}
                      title={`Remove ${a.characterName}`}
                    >
                      x
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}

          {/* Officer actions */}
          {isOfficer && isActive && (
            <div className="flex items-center gap-1 mt-1">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (addName.trim()) {
                    onAddCharacter(call.id, addName.trim());
                    setAddName('');
                  }
                }}
                className="flex items-center gap-0.5"
              >
                <Input
                  size="sm"
                  variant="surface"
                  type="text"
                  placeholder="Add character..."
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  className="w-25"
                />
                <Button intent="ghost" size="xs" type="submit" disabled={!addName.trim()}>Add</Button>
              </form>

              {!isConfirmingDelete ? (
                <Button
                  intent="danger"
                  size="xs"
                  onClick={() => onConfirmDelete(call.id)}
                  className="ml-auto"
                >
                  Delete Call
                </Button>
              ) : (
                <div className="flex items-center gap-0.5 ml-auto">
                  <Text variant="error" className="text-micro">Reverses DKP!</Text>
                  <Button
                    intent="danger"
                    size="xs"
                    onClick={() => onDelete(call.id)}
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Deleting...' : 'Confirm'}
                  </Button>
                  <Button intent="ghost" size="xs" onClick={() => onConfirmDelete(null)}>
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
