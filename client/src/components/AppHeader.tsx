import { NavLink } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import UserMenu from './UserMenu';

export default function AppHeader() {
  const { connected, showHelp } = useSocket();

  return (
    <>
      <header className="bg-surface border-b border-border px-5 flex justify-between items-stretch min-h-11">
        <div className="flex items-stretch">
          <h1 className="text-sm font-bold text-accent tracking-wide flex items-center">GuildSpace</h1>
          <nav className="flex ml-6">
            <NavLink
              to="/roster"
              className={({ isActive }) =>
                `text-text-dim no-underline text-xs font-medium px-3.5 flex items-center uppercase tracking-widest border-b-2 transition-colors duration-150 ${
                  isActive ? 'text-accent border-accent' : 'border-transparent hover:text-text'
                }`
              }
            >
              Roster
            </NavLink>
            <NavLink
              to="/terminal"
              className={({ isActive }) =>
                `text-text-dim no-underline text-xs font-medium px-3.5 flex items-center uppercase tracking-widest border-b-2 transition-colors duration-150 ${
                  isActive ? 'text-accent border-accent' : 'border-transparent hover:text-text'
                }`
              }
            >
              Terminal
            </NavLink>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="bg-transparent border border-border text-text-dim font-mono text-xs py-0.5 px-2 cursor-pointer hover:text-text hover:border-text-dim"
            onClick={showHelp}
            title="Show available commands"
          >
            [?]
          </button>
          <UserMenu />
        </div>
      </header>
      {!connected && (
        <div className="bg-red text-white text-center py-1.5 text-xs font-bold uppercase tracking-wide animate-[pulse_1.5s_ease-in-out_infinite]">
          Reconnecting...
        </div>
      )}
    </>
  );
}
