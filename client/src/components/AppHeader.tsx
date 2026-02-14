import { NavLink } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useSlidingIndicator } from '../hooks/useSlidingIndicator';
import { Button } from '../ui';
import { navLink, reconnectBanner } from '../ui/recipes';
import UserMenu from './UserMenu';

export default function AppHeader() {
  const { connected, showHelp, onlineCount, totalMembers } = useSocket();
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
          <NavLink
            to="/terminal"
            className={({ isActive }) => navLink({ active: isActive })}
          >
            Terminal
          </NavLink>
          {indicatorStyle && (
            <span
              className="absolute bottom-0 h-px bg-accent pointer-events-none"
              style={indicatorStyle}
            />
          )}
        </nav>
        <div className="md:hidden" />
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-caption text-text-dim lg:hidden">
            {totalMembers > 0 && (
              <span>{totalMembers} Members</span>
            )}
            {totalMembers > 0 && onlineCount > 0 && (
              <span className="text-border">·</span>
            )}
            {onlineCount > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-green inline-block" />
                {onlineCount} Online
              </span>
            )}
          </div>
          <Button intent="ghost" size="sm" onClick={showHelp} title="Show available commands" className="max-md:hidden">
            ?
          </Button>
          <UserMenu />
        </div>
      </header>
      {!connected && (
        <div className={reconnectBanner()}>Reconnecting...</div>
      )}
    </>
  );
}
