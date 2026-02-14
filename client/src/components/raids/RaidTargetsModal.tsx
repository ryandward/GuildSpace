import { useState } from 'react';
import { Button, Text, Heading, Input } from '../../ui';
import { modalOverlay, modalCard } from '../../ui/recipes';
import { useRaidTemplatesQuery } from '../../hooks/useRaidTemplatesQuery';
import {
  useCreateTemplateMutation,
  useUpdateTemplateMutation,
  useDeleteTemplateMutation,
} from '../../hooks/useRaidTemplateMutations';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function RaidTargetsModal({ isOpen, onClose }: Props) {
  const { data: templates, isLoading } = useRaidTemplatesQuery();
  const createMut = useCreateTemplateMutation();
  const updateMut = useUpdateTemplateMutation();
  const deleteMut = useDeleteTemplateMutation();

  const [editName, setEditName] = useState<string | null>(null);
  const [editType, setEditType] = useState('');
  const [editMod, setEditMod] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('');
  const [newMod, setNewMod] = useState('');

  if (!isOpen) return null;

  function startEdit(name: string, type: string | null, modifier: number) {
    setEditName(name);
    setEditType(type || '');
    setEditMod(String(modifier));
    setConfirmDelete(null);
  }

  function cancelEdit() {
    setEditName(null);
  }

  function saveEdit() {
    if (!editName) return;
    const mod = Number(editMod);
    if (isNaN(mod)) return;
    updateMut.mutate(
      { name: editName, type: editType || undefined, modifier: mod },
      { onSuccess: () => setEditName(null) },
    );
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const mod = Number(newMod);
    if (!newName.trim() || isNaN(mod)) return;
    createMut.mutate(
      { name: newName.trim(), type: newType.trim() || undefined, modifier: mod },
      {
        onSuccess: () => {
          setNewName('');
          setNewType('');
          setNewMod('');
        },
      },
    );
  }

  function handleDelete(name: string) {
    deleteMut.mutate(name, {
      onSuccess: () => setConfirmDelete(null),
    });
  }

  return (
    <div className={modalOverlay()} onClick={onClose}>
      <div className={modalCard() + ' max-h-[80vh] flex flex-col'} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <Heading level="heading">Raid Targets</Heading>
          <Button intent="ghost" size="xs" onClick={onClose}>Close</Button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {isLoading && <Text variant="caption" className="block text-center py-2">Loading...</Text>}

          {templates && templates.length === 0 && (
            <Text variant="caption" className="block text-center py-2">No raid targets defined yet.</Text>
          )}

          {templates && templates.map((t) => (
            <div key={t.name} className="flex items-center gap-1 py-0.5 px-1 border-b border-border min-h-6">
              {editName === t.name ? (
                <>
                  <Text variant="body" className="font-bold flex-1 truncate">{t.name}</Text>
                  <Input
                    size="sm"
                    type="text"
                    placeholder="Type"
                    value={editType}
                    onChange={(e) => setEditType(e.target.value)}
                    className="w-20"
                  />
                  <Input
                    size="sm"
                    type="number"
                    placeholder="DKP"
                    value={editMod}
                    onChange={(e) => setEditMod(e.target.value)}
                    className="w-14"
                  />
                  <Button
                    intent="primary"
                    size="xs"
                    onClick={saveEdit}
                    disabled={updateMut.isPending}
                  >
                    {updateMut.isPending ? '...' : 'Save'}
                  </Button>
                  <Button intent="ghost" size="xs" onClick={cancelEdit}>Cancel</Button>
                </>
              ) : (
                <>
                  <Text variant="body" className="font-bold flex-1 truncate">{t.name}</Text>
                  {t.type && <Text variant="caption" className="text-text-dim">{t.type}</Text>}
                  <Text variant="body" className="tabular-nums">{t.modifier} DKP</Text>
                  <Button intent="ghost" size="xs" onClick={() => startEdit(t.name, t.type, t.modifier)}>Edit</Button>
                  {confirmDelete === t.name ? (
                    <>
                      <Button
                        intent="danger"
                        size="xs"
                        onClick={() => handleDelete(t.name)}
                        disabled={deleteMut.isPending}
                      >
                        {deleteMut.isPending ? '...' : 'Confirm'}
                      </Button>
                      <Button intent="ghost" size="xs" onClick={() => setConfirmDelete(null)}>Cancel</Button>
                    </>
                  ) : (
                    <Button intent="danger" size="xs" onClick={() => { setConfirmDelete(t.name); setEditName(null); }}>
                      Delete
                    </Button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>

        {/* Add new template */}
        <form onSubmit={handleCreate} className="flex items-center gap-1 pt-2 mt-1 border-t border-border">
          <Input
            size="sm"
            type="text"
            placeholder="Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1"
          />
          <Input
            size="sm"
            type="text"
            placeholder="Type"
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
            className="w-20"
          />
          <Input
            size="sm"
            type="number"
            placeholder="DKP"
            value={newMod}
            onChange={(e) => setNewMod(e.target.value)}
            className="w-14"
          />
          <Button
            intent="primary"
            size="xs"
            type="submit"
            disabled={createMut.isPending || !newName.trim() || !newMod}
          >
            {createMut.isPending ? '...' : 'Create'}
          </Button>
        </form>
        {createMut.isError && <Text variant="error" className="mt-0.5">Failed to create — name may already exist</Text>}
      </div>
    </div>
  );
}
