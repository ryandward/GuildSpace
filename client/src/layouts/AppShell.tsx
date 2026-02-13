import { useSocket } from '../context/SocketContext';
import AppHeader from '../components/AppHeader';
import MessageList from '../components/MessageList';
import CommandInput from '../components/CommandInput';
import Modal from '../components/Modal';

export default function AppShell() {
  const { modal } = useSocket();

  return (
    <div className="flex flex-1 flex-col overflow-hidden grain-overlay">
      <AppHeader />
      <div className="flex-1 overflow-y-auto flex flex-col relative z-0">
        <div className="max-w-terminal mx-auto w-full flex-1 flex flex-col">
          <MessageList />
        </div>
      </div>
      <div className="max-w-terminal mx-auto w-full px-2 pb-2">
        <CommandInput />
      </div>
      {modal && <Modal />}
    </div>
  );
}
