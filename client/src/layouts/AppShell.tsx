import { useSocket } from '../context/SocketContext';
import AppHeader from '../components/AppHeader';
import MessageList from '../components/MessageList';
import CommandInput from '../components/CommandInput';
import Modal from '../components/Modal';

export default function AppShell() {
  const { modal } = useSocket();

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <AppHeader />
      <MessageList />
      <CommandInput />
      {modal && <Modal />}
    </div>
  );
}
