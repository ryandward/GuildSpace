import { useSocket } from '../context/SocketContext';
import MessageList from '../components/MessageList';
import CommandInput from '../components/CommandInput';
import Modal from '../components/Modal';
import UserMenu from '../components/UserMenu';

export default function AppShell() {
  const { modal, connected, showHelp } = useSocket();

  return (
    <div className="app-shell">
      <header>
        <h1>GuildSpace</h1>
        <div className="header-actions">
          <button className="help-btn" onClick={showHelp} title="Show available commands">[?]</button>
          <UserMenu />
        </div>
      </header>
      {!connected && (
        <div className="connection-banner">Reconnecting...</div>
      )}
      <MessageList />
      <CommandInput />
      {modal && <Modal />}
    </div>
  );
}
