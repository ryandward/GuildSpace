import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useSlidingIndicator } from '../hooks/useSlidingIndicator';
import { navLink, reconnectBanner } from '../ui/recipes';
import UserMenu from './UserMenu';

export default function AppHeader() {
  const { isDemo } = useAuth();
  const { connected, onlineCount, totalMembers } = useSocket();
  const { ref: navRef, style: indicatorStyle } = useSlidingIndicator<HTMLElement>();

  return (
    <>
      <header className="grid grid-cols-[auto_1fr_auto] items-center min-h-7 bg-bg-deep border-b border-border px-3">
        <h1 className="flex items-center font-display text-subheading font-bold text-accent tracking-wide">GuildSpace</h1>
        <nav ref={navRef} className="flex justify-center gap-1 max-md:hidden relative">
          <NavLink
            to="/roster"
            className={({ isActive }) => navLink({ active: isActive })}
          >
            Roster
          </NavLink>
          <NavLink
            to="/raids"
            className={({ isActive }) => navLink({ active: isActive })}
          >
            Raids
          </NavLink>
          <NavLink
            to="/bank"
            className={({ isActive }) => navLink({ active: isActive })}
          >
            Bank
          </NavLink>
          {!isDemo && (
            <NavLink
              to="/chat"
              className={({ isActive }) => navLink({ active: isActive })}
            >
              Chat
            </NavLink>
          )}
          {indicatorStyle && (
            <span
              className="absolute bottom-0 h-px bg-accent pointer-events-none"
              style={indicatorStyle}
            />
          )}
        </nav>
        <div className="md:hidden" />
        <div className="flex items-center gap-2">
          {!isDemo && totalMembers > 0 && (
            <>
              {/* Desktop: verbose */}
              <div className="flex items-center gap-2 text-caption text-text-dim max-md:hidden">
                <span>{totalMembers} Members</span>
                {onlineCount > 0 && <span className="text-border">&middot;</span>}
                {onlineCount > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-green inline-block" />
                    {onlineCount} Online
                  </span>
                )}
              </div>
              {/* Mobile: compact */}
              <span className="flex items-center gap-1 text-caption text-text-dim md:hidden">
                <span className="w-1 h-1 rounded-full bg-green inline-block" />
                {onlineCount}/{totalMembers}
              </span>
            </>
          )}
          <UserMenu />
        </div>
      </header>
      {!isDemo && !connected && (
        <div className={reconnectBanner()}>Reconnecting...</div>
      )}
    </>
  );
}
