import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

export default function UserMenu() {
  const { user, logout } = useAuth();
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

  return (
    <div className="relative" ref={menuRef}>
      <button
        className="bg-transparent border border-border text-text font-mono text-xs py-0.5 px-2.5 cursor-pointer flex items-center gap-1.5 hover:border-text-dim"
        onClick={() => setOpen(o => !o)}
      >
        <span className={`w-[7px] h-[7px] rounded-full shrink-0 ${connected ? 'bg-green' : 'bg-red'}`} />
        <span className="text-text-dim">{user.displayName || user.username}</span>
      </button>
      {open && (
        <div className="absolute top-[calc(100%+4px)] right-0 bg-surface border border-border min-w-[180px] z-50 animate-[fadeIn_0.15s_ease]">
          <div className="px-3 pt-2.5 pb-1.5">
            <span className="block text-xs font-bold text-text">{user.displayName || user.username}</span>
            {user.discordUsername && (
              <span className="block text-[10px] text-text-dim mt-0.5">@{user.discordUsername}</span>
            )}
          </div>
          <div className="px-3 py-1 pb-2 flex items-center gap-1.5 text-xs text-text-dim">
            <span className={`w-[7px] h-[7px] rounded-full shrink-0 ${connected ? 'bg-green' : 'bg-red'}`} />
            <span>{connected ? 'Connected' : 'Disconnected'}</span>
          </div>
          <div className="h-px bg-border" />
          <button
            className="block w-full text-left bg-transparent border-none text-text-dim font-mono text-xs py-2 px-3 cursor-pointer hover:bg-surface-2 hover:text-red"
            onClick={() => { setOpen(false); logout(); }}
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
