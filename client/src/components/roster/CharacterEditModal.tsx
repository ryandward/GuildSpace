import { useState, useEffect } from 'react';
import { Button, Text, Heading, Input, Select } from '../../ui';
import { modalOverlay, modalCard, text as textRecipe } from '../../ui/recipes';
import { CLASS_COLORS } from '../../lib/classColors';

const EQ_CLASSES = Object.keys(CLASS_COLORS);
const STATUSES = ['Main', 'Alt', 'Bot'] as const;

interface CharacterData {
  name: string;
  class: string;
  level: number;
  status: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** null = create mode, object = edit mode */
  character: CharacterData | null;
  onSave: (data: CharacterData) => void;
  onDrop?: (name: string) => void;
  isPending: boolean;
  error?: string | null;
}

export default function CharacterEditModal({ isOpen, onClose, character, onSave, onDrop, isPending, error }: Props) {
  const isEdit = character !== null;

  const [name, setName] = useState('');
  const [charClass, setCharClass] = useState(EQ_CLASSES[0]);
  const [level, setLevel] = useState(1);
  const [status, setStatus] = useState<string>('Main');
  const [confirmDrop, setConfirmDrop] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (character) {
        setName(character.name);
        setCharClass(character.class);
        setLevel(character.level);
        setStatus(character.status);
      } else {
        setName('');
        setCharClass(EQ_CLASSES[0]);
        setLevel(1);
        setStatus('Main');
      }
      setConfirmDrop(false);
    }
  }, [isOpen, character]);

  if (!isOpen) return null;

  function handleSave() {
    if (!name.trim()) return;
    onSave({ name: name.trim(), class: charClass, level, status });
  }

  function handleDrop() {
    if (confirmDrop && onDrop && character) {
      onDrop(character.name);
    } else {
      setConfirmDrop(true);
    }
  }

  return (
    <div className={modalOverlay()} onClick={onClose}>
      <div className={modalCard() + ' flex flex-col gap-2'} onClick={e => e.stopPropagation()}>
        <Heading level="heading">{isEdit ? `Edit ${character.name}` : 'New Character'}</Heading>

        {/* Name */}
        <div className="flex flex-col gap-0.5">
          <label className={textRecipe({ variant: 'label' })}>Name</label>
          {isEdit ? (
            <Text variant="body" className="font-semibold">{character.name}</Text>
          ) : (
            <Input
              size="sm"
              type="text"
              maxLength={24}
              placeholder="Character name"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full"
            />
          )}
        </div>

        {/* Class */}
        <div className="flex flex-col gap-0.5">
          <label className={textRecipe({ variant: 'label' })}>Class</label>
          <Select size="sm" value={charClass} onChange={e => setCharClass(e.target.value)} className="w-full">
            {EQ_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
        </div>

        {/* Level */}
        <div className="flex flex-col gap-0.5">
          <label className={textRecipe({ variant: 'label' })}>Level</label>
          <Input
            size="sm"
            type="number"
            min={1}
            max={60}
            value={level}
            onChange={e => setLevel(Math.max(1, Math.min(60, Number(e.target.value) || 1)))}
            className="w-24"
          />
        </div>

        {/* Status */}
        <div className="flex flex-col gap-0.5">
          <label className={textRecipe({ variant: 'label' })}>Status</label>
          <div className="flex gap-1">
            {STATUSES.map(s => (
              <Button
                key={s}
                size="sm"
                intent={status === s ? 'primary' : 'ghost'}
                onClick={() => setStatus(s)}
                type="button"
              >
                {s}
              </Button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && <Text variant="error">{error}</Text>}

        {/* Footer */}
        <div className="flex items-center gap-1 pt-1 border-t border-border">
          {isEdit && onDrop && (
            confirmDrop ? (
              <>
                <Button size="sm" intent="danger" onClick={handleDrop} disabled={isPending}>
                  {isPending ? '...' : 'Confirm Drop'}
                </Button>
                <Button size="sm" intent="ghost" onClick={() => setConfirmDrop(false)}>Cancel</Button>
              </>
            ) : (
              <Button size="sm" intent="danger" onClick={handleDrop} disabled={isPending}>Drop</Button>
            )
          )}
          <div className="ml-auto flex gap-1">
            <Button size="sm" intent="ghost" onClick={onClose}>Cancel</Button>
            <Button size="sm" intent="primary" onClick={handleSave} disabled={isPending || (!isEdit && !name.trim())}>
              {isPending ? '...' : isEdit ? 'Save' : 'Create'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
