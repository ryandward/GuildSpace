import { NavLink } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { Button } from '../ui';
import { navLink, reconnectBanner } from '../ui/recipes';
import UserMenu from './UserMenu';

export default function AppHeader() {
  const { connected, showHelp } = useSocket();

  return (
    <>
      <header className="flex justify-between items-stretch min-h-6 bg-surface border-b border-border px-2.5">
        <div className="flex items-stretch">
          <h1 className="flex items-center font-display text-subheading font-bold text-accent tracking-wide">GuildSpace</h1>
          <nav className="flex ml-3">
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
              to="/terminal"
              className={({ isActive }) => navLink({ active: isActive })}
            >
              Terminal
            </NavLink>
          </nav>
        </div>
        <div className="flex items-center gap-1">
          <Button intent="ghost" size="sm" onClick={showHelp} title="Show available commands">
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
