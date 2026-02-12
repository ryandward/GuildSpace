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
    <div className="user-menu" ref={menuRef}>
      <button className="user-menu-trigger" onClick={() => setOpen(o => !o)}>
        <span className={`status-dot ${connected ? 'online' : 'offline'}`} />
        <span className="user-menu-name">{user.displayName || user.username}</span>
      </button>
      {open && (
        <div className="user-menu-dropdown">
          <div className="user-menu-header">
            <span className="user-menu-display">{user.displayName || user.username}</span>
            {user.discordUsername && (
              <span className="user-menu-discord">@{user.discordUsername}</span>
            )}
          </div>
          <div className="user-menu-status">
            <span className={`status-dot ${connected ? 'online' : 'offline'}`} />
            <span>{connected ? 'Connected' : 'Disconnected'}</span>
          </div>
          <div className="user-menu-divider" />
          <button className="user-menu-item" onClick={() => { setOpen(false); logout(); }}>
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
