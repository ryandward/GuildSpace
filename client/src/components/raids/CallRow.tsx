import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button, Badge, Text, Input, Select } from '../../ui';
import { dropdown, dropdownItem } from '../../ui/recipes';
import { useToonSearchQuery } from '../../hooks/useToonSearchQuery';
import type { CallDetail } from '../../hooks/useEventDetailQuery';
import type { RaidTemplate } from '../../hooks/useRaidTemplatesQuery';
import { getClassColor } from '../../lib/classColors';

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
  onEditCall?: (callId: number, raidName: string, modifier: number) => void;
  isEditPending?: boolean;
  templates?: RaidTemplate[];
}

export default function CallRow({
  call, index, isOfficer, isActive,
  confirmDeleteId, onConfirmDelete, onDelete, isDeleting,
  onAddCharacter, onRemoveCharacter,
  onEditCall, isEditPending, templates,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [addName, setAddName] = useState('');
  const [debouncedName, setDebouncedName] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [editing, setEditing] = useState(false);
  const [editRaidName, setEditRaidName] = useState('');
  const [editModifier, setEditModifier] = useState('');

  const { data: suggestions } = useToonSearchQuery(debouncedName);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (addName.trim().length > 0) {
      debounceRef.current = setTimeout(() => setDebouncedName(addName.trim()), 150);
    } else {
      setDebouncedName('');
    }
    return () => clearTimeout(debounceRef.current);
  }, [addName]);

  const isConfirmingDelete = confirmDeleteId === call.id;

  function startEdit() {
    setEditing(true);
    setEditRaidName(call.raidName);
    setEditModifier(String(call.modifier));
    setConfirmDeleteId(null);
  }

  function setConfirmDeleteId(id: number | null) {
    onConfirmDelete(id);
  }

  function cancelEdit() {
    setEditing(false);
  }

  function saveEdit() {
    const mod = Number(editModifier);
    if (!editRaidName.trim() || isNaN(mod)) return;
    onEditCall?.(call.id, editRaidName.trim(), mod);
    setEditing(false);
  }

  function handleTemplateSelect(value: string) {
    const tmpl = templates?.find(t => t.name === value);
    if (tmpl) {
      setEditRaidName(tmpl.name);
      setEditModifier(String(tmpl.modifier));
    }
  }

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
                  <Link to={`/roster/${a.discordId}`} className="no-underline hover:brightness-125 transition-all duration-fast">
                    <Badge
                      variant="count"
                      style={a.characterClass ? { color: getClassColor(a.characterClass) } : undefined}
                    >{a.characterName}</Badge>
                  </Link>
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

          {/* Edit call form */}
          {editing && (
            <div className="flex flex-col gap-1 py-1 px-1 bg-surface-2 rounded-md mb-1">
              <div className="flex items-center gap-1 flex-wrap">
                {templates && templates.length > 0 && (
                  <Select
                    size="sm"
                    value=""
                    onChange={(e) => handleTemplateSelect(e.target.value)}
                  >
                    <option value="">Template...</option>
                    {templates.map(t => (
                      <option key={t.name} value={t.name}>{t.name} ({t.modifier})</option>
                    ))}
                  </Select>
                )}
                <Input
                  size="sm"
                  type="text"
                  placeholder="Raid name"
                  value={editRaidName}
                  onChange={(e) => setEditRaidName(e.target.value)}
                  className="flex-1 min-w-20"
                />
                <Input
                  size="sm"
                  type="number"
                  placeholder="DKP"
                  value={editModifier}
                  onChange={(e) => setEditModifier(e.target.value)}
                  className="w-14"
                />
              </div>
              <div className="flex items-center gap-0.5">
                <Button
                  intent="primary"
                  size="xs"
                  onClick={saveEdit}
                  disabled={isEditPending || !editRaidName.trim() || !editModifier}
                >
                  {isEditPending ? 'Saving...' : 'Save'}
                </Button>
                <Button intent="ghost" size="xs" onClick={cancelEdit}>Cancel</Button>
                {Number(editModifier) !== call.modifier && !isNaN(Number(editModifier)) && (
                  <Text variant="caption" className="text-text-dim ml-1">
                    DKP delta: {Number(editModifier) - call.modifier > 0 ? '+' : ''}{Number(editModifier) - call.modifier} per member
                  </Text>
                )}
              </div>
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
                    setShowSuggestions(false);
                  }
                }}
                className="flex items-center gap-0.5"
              >
                <div className="relative">
                  {showSuggestions && suggestions && suggestions.length > 0 && (
                    <div className={dropdown({ position: 'above' }) + ' max-h-25 border-b-0 rounded-b-none'}>
                      {suggestions.map((name, i) => (
                        <div
                          key={name}
                          className={dropdownItem({ selected: i === selectedIdx })}
                          onMouseDown={() => {
                            onAddCharacter(call.id, name);
                            setAddName('');
                            setShowSuggestions(false);
                          }}
                        >
                          {name}
                        </div>
                      ))}
                    </div>
                  )}
                  <Input
                    size="sm"
                    variant="surface"
                    type="text"
                    placeholder="Add character..."
                    autoComplete="off"
                    value={addName}
                    onChange={(e) => {
                      setAddName(e.target.value);
                      setShowSuggestions(true);
                      setSelectedIdx(0);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                    onKeyDown={(e) => {
                      if (!showSuggestions || !suggestions?.length) return;
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setSelectedIdx(i => Math.min(i + 1, suggestions.length - 1));
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setSelectedIdx(i => Math.max(i - 1, 0));
                      } else if (e.key === 'Tab' || e.key === 'Enter') {
                        if (selectedIdx >= 0 && selectedIdx < suggestions.length) {
                          e.preventDefault();
                          onAddCharacter(call.id, suggestions[selectedIdx]);
                          setAddName('');
                          setShowSuggestions(false);
                        }
                      }
                    }}
                    className="w-25"
                  />
                </div>
                <Button intent="ghost" size="xs" type="submit" disabled={!addName.trim()}>Add</Button>
              </form>

              {!editing && onEditCall && (
                <Button intent="ghost" size="xs" onClick={startEdit}>Edit Call</Button>
              )}

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
