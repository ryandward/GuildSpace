import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useChatChannelsQuery, type ChatChannel } from '../hooks/useChatChannelsQuery';
import { useCreateChannelMutation } from '../hooks/useChatChannelMutations';
import { Button, Heading } from '../ui';
import { Input, Select } from '../ui/Input';
import { modalOverlay, modalCard, text } from '../ui/recipes';

function toSlug(displayName: string): string {
  return displayName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const fallbackChannels: ChatChannel[] = [
  { name: 'general', displayName: 'General', minRole: 'member', createdBy: 'system', createdAt: '', id: 0 },
];

/** Vertical channel list for the sidebar (lg+ screens) */
export function ChannelListSidebar() {
  const { user } = useAuth();
  const { data: channels } = useChatChannelsQuery();
  const [showCreate, setShowCreate] = useState(false);

  const canCreate = user?.isOfficer || user?.isAdmin || user?.isOwner;

  return (
    <>
      <div className="px-2 pt-1.5 pb-0.5 flex items-center justify-between">
        <span className={text({ variant: 'overline' })}>CHANNELS</span>
        {canCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="bg-transparent border-none cursor-pointer text-text-dim hover:text-accent text-caption p-0 leading-none"
            title="Create channel"
          >
            +
          </button>
        )}
      </div>
      <div className="flex flex-col">
        {(channels ?? fallbackChannels).map(ch => (
          <NavLink
            key={ch.name}
            to={ch.name === 'general' ? '/chat' : `/chat/${ch.name}`}
            end={ch.name === 'general'}
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-2 py-1 no-underline font-body text-caption transition-colors duration-fast ${
                isActive
                  ? 'text-accent font-bold bg-surface-2'
                  : 'text-text-secondary hover:text-text hover:bg-surface-2'
              }`
            }
          >
            <span className="text-text-dim">#</span>
            {ch.displayName}
          </NavLink>
        ))}
      </div>
      {showCreate && <CreateChannelDialog onClose={() => setShowCreate(false)} />}
    </>
  );
}

/** Horizontal channel strip for mobile (below lg) — shown inside AppShell */
export function ChannelStripMobile() {
  const { user } = useAuth();
  const { data: channels } = useChatChannelsQuery();
  const [showCreate, setShowCreate] = useState(false);

  const canCreate = user?.isOfficer || user?.isAdmin || user?.isOwner;

  return (
    <>
      <div className="flex items-center gap-0.5 px-2 py-0.5 border-b border-border overflow-x-auto scrollbar-none lg:hidden">
        {(channels ?? fallbackChannels).map(ch => (
          <NavLink
            key={ch.name}
            to={ch.name === 'general' ? '/chat' : `/chat/${ch.name}`}
            end={ch.name === 'general'}
            className={({ isActive }) =>
              `whitespace-nowrap no-underline font-body text-caption px-1.5 py-1 transition-colors duration-fast ${
                isActive
                  ? 'text-accent font-bold'
                  : 'text-text-secondary hover:text-text'
              }`
            }
          >
            #{ch.displayName}
          </NavLink>
        ))}
        {canCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="whitespace-nowrap bg-transparent border-none cursor-pointer font-body text-caption text-text-dim hover:text-accent px-1.5 py-1"
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

/** Default export for backwards compat — renders mobile strip */
export default function ChannelTabs() {
  return <ChannelStripMobile />;
}

function CreateChannelDialog({ onClose }: { onClose: () => void }) {
  const [displayName, setDisplayName] = useState('');
  const [minRole, setMinRole] = useState('member');
  const createMutation = useCreateChannelMutation();
  const navigate = useNavigate();

  const slug = toSlug(displayName);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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

        <label className={text({ variant: 'label' }) + ' block mb-0.5'}>Channel Name</label>
        <Input
          size="lg"
          placeholder="e.g. Officers Only"
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          className="w-full mb-0.5"
        />
        {slug && (
          <p className={text({ variant: 'caption' }) + ' mb-1.5'}>#{slug}</p>
        )}

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
