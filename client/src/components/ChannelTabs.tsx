import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useChatChannelsQuery } from '../hooks/useChatChannelsQuery';
import { useCreateChannelMutation } from '../hooks/useChatChannelMutations';
import { Button, Heading } from '../ui';
import { Input, Select } from '../ui/Input';
import { button, modalOverlay, modalCard, text } from '../ui/recipes';

export default function ChannelTabs() {
  const { user } = useAuth();
  const { activeChannel } = useSocket();
  const { data: channels } = useChatChannelsQuery();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);

  const canCreate = user?.isOfficer || user?.isAdmin || user?.isOwner;

  function handleSwitch(name: string) {
    if (name === 'general') {
      navigate('/chat');
    } else {
      navigate(`/chat/${name}`);
    }
  }

  return (
    <>
      <div className="flex items-center gap-0.5 px-2 py-1 border-b border-border overflow-x-auto scrollbar-none">
        {(channels ?? [{ name: 'general', displayName: 'General', minRole: 'member', createdBy: 'system', createdAt: '', id: 0 }]).map(ch => (
          <button
            key={ch.name}
            onClick={() => handleSwitch(ch.name)}
            className={button({
              intent: activeChannel === ch.name ? 'primary' : 'ghost',
              size: 'xs',
            }) + ' whitespace-nowrap'}
          >
            {ch.displayName}
          </button>
        ))}
        {canCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className={button({ intent: 'ghost', size: 'xs' }) + ' whitespace-nowrap'}
            title="Create channel"
          >
            +
          </button>
        )}
      </div>
      {showCreate && <CreateChannelDialog onClose={() => setShowCreate(false)} />}
    </>
  );
}

function CreateChannelDialog({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [minRole, setMinRole] = useState('member');
  const createMutation = useCreateChannelMutation();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const slug = name.toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (!slug || !displayName.trim()) return;

    try {
      const created = await createMutation.mutateAsync({
        name: slug,
        displayName: displayName.trim(),
        minRole,
      });
      navigate(`/chat/${created.name}`);
      onClose();
    } catch {
      // Error handled by mutation state
    }
  }

  return (
    <div className={modalOverlay()} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <form className={modalCard()} onSubmit={handleSubmit}>
        <Heading level="heading" className="mb-2">Create Channel</Heading>

        <label className={text({ variant: 'label' }) + ' block mb-0.5'}>Slug</label>
        <Input
          size="lg"
          placeholder="e.g. officers"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full mb-1.5"
        />

        <label className={text({ variant: 'label' }) + ' block mb-0.5'}>Display Name</label>
        <Input
          size="lg"
          placeholder="e.g. Officers Only"
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          className="w-full mb-1.5"
        />

        <label className={text({ variant: 'label' }) + ' block mb-0.5'}>Minimum Role</label>
        <Select
          size="lg"
          value={minRole}
          onChange={e => setMinRole(e.target.value)}
          className="w-full mb-1.5"
        >
          <option value="member">Member</option>
          <option value="officer">Officer</option>
          <option value="admin">Admin</option>
          <option value="owner">Owner</option>
        </Select>

        {createMutation.error && (
          <p className={text({ variant: 'error' }) + ' mb-1'}>
            {(createMutation.error as Error).message}
          </p>
        )}

        <div className="flex gap-1 justify-end mt-1.5">
          <Button intent="danger" size="md" type="button" onClick={onClose}>Cancel</Button>
          <Button
            intent="success"
            size="md"
            type="submit"
            pending={createMutation.isPending}
          >
            Create
          </Button>
        </div>
      </form>
    </div>
  );
}
