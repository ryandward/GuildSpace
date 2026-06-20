import { useState } from 'react';
import { Button, Text, Input } from '../../ui';
import type { CallDetail } from '../../hooks/useEventDetailQuery';
import AssignToonDialog from './AssignToonDialog';

interface Props {
  call: CallDetail;
  isOfficer: boolean;
  isActive: boolean;
  eventId: number;
  onDismissName: (callId: number, name: string, reason?: string) => void;
  onUndoDismiss: (callId: number, name: string) => void;
}

export default function UnrecognizedList({
  call, isOfficer, isActive, eventId,
  onDismissName, onUndoDismiss,
}: Props) {
  const [assignName, setAssignName] = useState<string | null>(null);
  const [ignoreName, setIgnoreName] = useState<string | null>(null);
  const [ignoreReason, setIgnoreReason] = useState('');

  const assignTarget = call.unrecognized.find(u => u.name === assignName) ?? null;

  if (call.unrecognized.length === 0 && call.dismissed.length === 0) return null;

  return (
    <div className="mt-1 flex flex-col gap-1">
      {call.unrecognized.length > 0 && (
        <div className="border border-yellow/40 px-1.5 py-1 bg-yellow/10 rounded-md">
          <Text variant="caption" className="text-yellow font-bold">
            {call.unrecognized.length} not in census (from /who):
          </Text>
          <div className="flex flex-col gap-0.5 mt-0.5">
            {call.unrecognized.map(u => (
              <div key={u.name} className="flex items-center gap-1 flex-wrap">
                <Text variant="caption" className="font-mono">
                  {u.name}{u.level != null ? ` — ${u.level} ${u.className ?? ''}`.trimEnd() : ''}
                </Text>
                {isOfficer && isActive && (
                  <div className="flex items-center gap-0.5">
                    <Button
                      intent="primary"
                      size="xs"
                      onClick={() => { setAssignName(u.name); setIgnoreName(null); }}
                    >
                      Assign
                    </Button>
                    <Button
                      intent="ghost"
                      size="xs"
                      onClick={() => { setIgnoreName(u.name); setIgnoreReason(''); }}
                    >
                      Ignore
                    </Button>
                  </div>
                )}
                {ignoreName === u.name && (
                  <form
                    className="flex items-center gap-0.5 w-full mt-0.5"
                    onSubmit={(e) => {
                      e.preventDefault();
                      onDismissName(call.id, u.name, ignoreReason.trim() || undefined);
                      setIgnoreName(null);
                    }}
                  >
                    <Input
                      size="sm"
                      variant="surface"
                      type="text"
                      placeholder="Reason (optional)"
                      value={ignoreReason}
                      onChange={(e) => setIgnoreReason(e.target.value)}
                      className="flex-1 min-w-25"
                      autoFocus
                    />
                    <Button intent="ghost" size="xs" type="submit">Confirm</Button>
                    <Button intent="ghost" size="xs" type="button" onClick={() => setIgnoreName(null)}>Cancel</Button>
                  </form>
                )}
                {assignTarget?.name === u.name && (
                  <AssignToonDialog
                    eventId={eventId}
                    callId={call.id}
                    name={u.name}
                    level={u.level}
                    className={u.className}
                    callModifier={call.modifier}
                    onClose={() => setAssignName(null)}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {call.dismissed.length > 0 && (
        <div className="px-1.5">
          <Text variant="caption" className="text-text-dim">Ignored on this call:</Text>
          <div className="flex flex-col gap-0.5 mt-0.5">
            {call.dismissed.map(d => (
              <div key={d.name} className="flex items-center gap-1 flex-wrap">
                <Text variant="caption" className="font-mono text-text-dim">
                  {d.name}{d.reason ? ` — "${d.reason}"` : ''}
                </Text>
                {isOfficer && isActive && (
                  <Button intent="ghost" size="xs" onClick={() => onUndoDismiss(call.id, d.name)}>undo</Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
