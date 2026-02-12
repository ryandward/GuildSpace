import { NavLink } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import UserMenu from './UserMenu';

export default function AppHeader() {
  const { connected, showHelp } = useSocket();

  return (
    <>
      <header>
        <div className="header-left">
          <h1>GuildSpace</h1>
          <nav className="header-nav">
            <NavLink to="/roster" className="nav-link">Roster</NavLink>
            <NavLink to="/terminal" className="nav-link">Terminal</NavLink>
          </nav>
        </div>
        <div className="header-actions">
          <button className="help-btn" onClick={showHelp} title="Show available commands">[?]</button>
          <UserMenu />
        </div>
      </header>
      {!connected && (
        <div className="connection-banner">Reconnecting...</div>
      )}
    </>
  );
}
