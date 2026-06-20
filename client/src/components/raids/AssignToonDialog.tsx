import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Button, Text, Input, Select } from '../../ui';
import { useRosterQuery } from '../../hooks/useRosterQuery';
import { useAssignToonMutation } from '../../hooks/useRaidMutations';
import { ApiError } from '../../lib/api';

interface Props {
  eventId: number;
  callId: number;
  name: string;
  level: number | null;
  className: string | null;
  callModifier: number;
  onClose: () => void;
}

export default function AssignToonDialog({
  eventId, callId, name, level, className, callModifier, onClose,
}: Props) {
  const { data: roster } = useRosterQuery();
  const assign = useAssignToonMutation(eventId);

  const [search, setSearch] = useState('');
  const [discordId, setDiscordId] = useState<string | null>(null);
  const [status, setStatus] = useState('Alt');
  const [levelStr, setLevelStr] = useState(level != null ? String(level) : '');
  const [charClass, setCharClass] = useState('');
  const [credit, setCredit] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const classOptions = useMemo(
    () => Object.keys(roster?.classAbbreviations ?? {}).sort(),
    [roster],
  );

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return (roster?.members ?? [])
      .filter(m =>
        m.displayName.toLowerCase().includes(q) ||
        (m.mainName ? m.mainName.toLowerCase().includes(q) : false),
      )
      .slice(0, 8);
  }, [roster, search]);

  const selectedMember = roster?.members.find(m => m.discordId === discordId) ?? null;

  function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const lvl = Number(levelStr);
    if (!discordId) { setError('Pick a member to assign to'); return; }
    if (!charClass) { setError('Pick a class'); return; }
    if (isNaN(lvl) || lvl < 1 || lvl > 60) { setError('Level must be between 1 and 60'); return; }
    assign.mutate(
      { callId, name, discordId, status, level: lvl, characterClass: charClass, credit },
      {
        onSuccess: () => onClose(),
        onError: (err) => setError(err instanceof ApiError ? err.message : 'Failed to assign'),
      },
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-1 p-1.5 bg-surface-2 rounded-md border border-border mt-0.5 w-full">
      <Text variant="caption" className="font-bold">Assign “{name}” to a member</Text>

      {selectedMember ? (
        <div className="flex items-center gap-1">
          <Text variant="caption">Owner: <span className="font-bold">{selectedMember.displayName}</span></Text>
          <Button intent="ghost" size="xs" type="button" onClick={() => { setDiscordId(null); setSearch(''); }}>change</Button>
        </div>
      ) : (
        <div>
          <Input
            size="sm"
            variant="surface"
            type="text"
            placeholder="Search members…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoComplete="off"
            autoFocus
          />
          {matches.length > 0 && (
            <div className="flex flex-col mt-0.5 max-h-25 overflow-y-auto border border-border rounded-md">
              {matches.map(m => (
                <button
                  key={m.discordId}
                  type="button"
                  className="text-left px-1 py-0.5 hover:bg-surface-3 bg-transparent border-none cursor-pointer"
                  onMouseDown={() => {
                    setDiscordId(m.discordId);
                    setStatus(m.mainName ? 'Alt' : 'Main');
                  }}
                >
                  <Text variant="caption">{m.displayName}{m.mainName ? ` (${m.mainName})` : ''}</Text>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-1">
        <Input
          size="sm"
          variant="surface"
          type="number"
          placeholder="Level"
          value={levelStr}
          onChange={(e) => setLevelStr(e.target.value)}
          className="w-14"
        />
        <Select size="sm" value={charClass} onChange={(e) => setCharClass(e.target.value)}>
          <option value="">{className ? `Class… (/who: ${className})` : 'Class…'}</option>
          {classOptions.map(c => <option key={c} value={c}>{c}</option>)}
        </Select>
      </div>

      <div className="flex items-center gap-1.5">
        {['Main', 'Alt', 'Bot'].map(s => (
          <label key={s} className="flex items-center gap-0.5 cursor-pointer">
            <input type="radio" name={`status-${callId}-${name}`} value={s} checked={status === s} onChange={() => setStatus(s)} />
            <Text variant="caption">{s}</Text>
          </label>
        ))}
      </div>

      <label className="flex items-center gap-0.5 cursor-pointer">
        <input type="checkbox" checked={credit} onChange={(e) => setCredit(e.target.checked)} />
        <Text variant="caption">Also credit this call (+{callModifier} DKP)</Text>
      </label>

      {error && <Text variant="error" className="text-micro">{error}</Text>}

      <div className="flex items-center gap-0.5">
        <Button intent="primary" size="xs" type="submit" disabled={assign.isPending}>
          {assign.isPending ? 'Assigning…' : 'Assign'}
        </Button>
        <Button intent="ghost" size="xs" type="button" onClick={onClose}>Cancel</Button>
      </div>
    </form>
  );
}
