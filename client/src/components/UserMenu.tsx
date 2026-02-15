import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Button, StatusDot } from '../ui';
import { dropdown, text } from '../ui/recipes';

export default function UserMenu() {
  const { user, isDemo, logout } = useAuth();
  const { connected } = useSocket();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  if (!user) return null;

  if (isDemo) {
    return (
      <div className="relative" ref={menuRef}>
        <Button intent="ghost" size="sm" className="gap-1" onClick={() => setOpen(o => !o)}>
          <span className={text({ variant: 'secondary' })}>Demo Mode</span>
        </Button>
        {open && (
          <div className={dropdown({ position: 'below-right' })}>
            <div className="px-1.5 pt-1.5 pb-1">
              <span className={text({ variant: 'caption' }) + ' block'}>
                You're browsing demo data
              </span>
            </div>
            <div className="h-px bg-border" />
            <a
              href="/api/auth/discord"
              className="block w-full text-left bg-transparent border-none text-accent font-body text-caption py-1 px-1.5 cursor-pointer hover:bg-surface-2 no-underline"
            >
              Log in with Discord
            </a>
            <button
              className="block w-full text-left bg-transparent border-none text-text-dim font-body text-caption py-1 px-1.5 cursor-pointer hover:bg-surface-2 hover:text-red rounded-b-md"
              onClick={() => { setOpen(false); logout(); }}
            >
              Exit demo
            </button>
          </div>
        )}
      </div>
    );
  }

  const connStatus = connected ? 'connected' : 'disconnected';

  return (
    <div className="relative" ref={menuRef}>
      <Button intent="ghost" size="sm" className="gap-1" onClick={() => setOpen(o => !o)}>
        <StatusDot status={connStatus} size="sm" />
        <span className={text({ variant: 'secondary' }) + ' max-md:sr-only'}>{user.displayName || user.username}</span>
      </Button>
      {open && (
        <div className={dropdown({ position: 'below-right' })}>
          <div className="px-1.5 pt-1.5 pb-1">
            <span className={text({ variant: 'body' }) + ' block font-bold text-caption'}>{user.displayName || user.username}</span>
            {user.discordUsername && (
              <span className={text({ variant: 'caption' }) + ' block mt-0.5 text-micro'}>@{user.discordUsername}</span>
            )}
          </div>
          <div className="flex items-center gap-1 px-1.5 py-0.5 pb-1">
            <StatusDot status={connStatus} size="sm" />
            <span className={text({ variant: 'caption' })}>{connected ? 'Connected' : 'Disconnected'}</span>
          </div>
          <div className="h-px bg-border" />
          <button
            className="block w-full text-left bg-transparent border-none text-text-dim font-body text-caption py-1 px-1.5 cursor-pointer hover:bg-surface-2 hover:text-red rounded-b-md"
            onClick={() => { setOpen(false); logout(); }}
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
