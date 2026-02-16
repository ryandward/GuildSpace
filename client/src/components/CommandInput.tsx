import { useState, useRef, type KeyboardEvent, type ChangeEvent } from 'react';
import { useSocket } from '../context/SocketContext';
import { Button, Card } from '../ui';
import { Input } from '../ui/Input';

export default function CommandInput() {
  const { sendChat } = useSocket();
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function execute() {
    const trimmed = value.trim();
    if (!trimmed) return;
    sendChat(trimmed);
    setValue('');
  }

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    setValue(e.target.value);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      execute();
    }
  }

  return (
    <Card elevated className="py-1.5 px-2 flex gap-1 relative">
      <Input
        ref={inputRef}
        size="lg"
        type="text"
        placeholder="Type a message"
        autoComplete="off"
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        className="flex-1"
      />
      <Button intent="primary" size="lg" onClick={execute}>Send</Button>
    </Card>
  );
}
