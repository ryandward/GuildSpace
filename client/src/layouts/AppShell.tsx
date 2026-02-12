import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import MessageList from '../components/MessageList';
import CommandInput from '../components/CommandInput';
import Modal from '../components/Modal';

export default function AppShell() {
  const { user } = useAuth();
  const { modal } = useSocket();

  return (
    <div className="app-shell">
      <header>
        <h1>GuildSpace</h1>
        <span className="user-info">Logged in as {user?.displayName || user?.username}</span>
      </header>
      <MessageList />
      <CommandInput />
      {modal && <Modal />}
    </div>
  );
}
