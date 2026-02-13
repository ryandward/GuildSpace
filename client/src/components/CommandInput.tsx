import { useState, useRef, useCallback, type KeyboardEvent, type ChangeEvent } from 'react';
import { useSocket, type Command } from '../context/SocketContext';
import { Button, Card } from '../ui';
import { Input } from '../ui/Input';
import { dropdown, dropdownItem, text } from '../ui/recipes';
import CommandForm from './CommandForm';

interface AcItem {
  name: string;
  value: string;
  desc?: string;
}

type InputMode = 'chat' | 'command-select' | 'form';

export default function CommandInput() {
  const { commands, executeCommand, sendChat } = useSocket();

  const [mode, setMode] = useState<InputMode>('chat');
  const [value, setValue] = useState('');
  const [acItems, setAcItems] = useState<AcItem[]>([]);
  const [acSelected, setAcSelected] = useState(-1);
  const [acVisible, setAcVisible] = useState(false);
  const [selectedCommand, setSelectedCommand] = useState<Command | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const hideAutocomplete = useCallback(() => {
    setAcVisible(false);
    setAcItems([]);
    setAcSelected(-1);
  }, []);

  function showCommandAutocomplete(partial: string) {
    const matches = commands.filter(c => c.name.startsWith(partial));
    if (matches.length === 0) {
      hideAutocomplete();
      return;
    }
    const items = matches.map(c => ({ name: `/${c.name}`, value: c.name, desc: c.description }));
    setAcItems(items);
    setAcSelected(0);
    setAcVisible(true);
    setMode('command-select');
  }

  function selectCommand(cmdName: string) {
    const cmd = commands.find(c => c.name === cmdName);
    hideAutocomplete();

    if (!cmd) {
      setValue('');
      setMode('chat');
      return;
    }

    if (cmd.options && cmd.options.length > 0) {
      setSelectedCommand(cmd);
      setMode('form');
      setValue('');
    } else {
      executeCommand(cmd.name, {});
      setValue('');
      setMode('chat');
    }
  }

  function selectItem(item: AcItem) {
    selectCommand(item.value);
  }

  function handleInputChange(val: string) {
    if (val.startsWith('/')) {
      const parts = val.slice(1).split(/\s+/);
      const cmdName = parts[0].toLowerCase();

      if (parts.length === 1 && !val.includes(' ')) {
        showCommandAutocomplete(cmdName);
        return;
      }

      if (parts.length >= 1 && val.includes(' ')) {
        const cmd = commands.find(c => c.name === cmdName);
        if (cmd) {
          selectCommand(cmdName);
          return;
        }
      }
    } else {
      hideAutocomplete();
      setMode('chat');
    }
  }

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setValue(val);
    handleInputChange(val);
  }

  function execute() {
    const trimmed = value.trim();
    if (!trimmed) return;

    if (!trimmed.startsWith('/')) {
      sendChat(trimmed);
      setValue('');
      setMode('chat');
      return;
    }

    hideAutocomplete();

    const parts = trimmed.slice(1).split(/\s+/);
    const cmdName = parts[0].toLowerCase();
    selectCommand(cmdName);
  }

  function handleFormExecute(options: Record<string, unknown>) {
    if (!selectedCommand) return;
    executeCommand(selectedCommand.name, options);
    setSelectedCommand(null);
    setMode('chat');
    setValue('');
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function handleFormCancel() {
    setSelectedCommand(null);
    setMode('chat');
    setValue('');
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Tab' && acVisible) {
      e.preventDefault();
      if (acSelected >= 0 && acSelected < acItems.length) {
        selectItem(acItems[acSelected]);
      }
      return;
    }
    if (e.key === 'ArrowDown' && acVisible) {
      e.preventDefault();
      setAcSelected(s => Math.min(s + 1, acItems.length - 1));
      return;
    }
    if (e.key === 'ArrowUp' && acVisible) {
      e.preventDefault();
      setAcSelected(s => Math.max(s - 1, 0));
      return;
    }
    if (e.key === 'Enter') {
      if (acVisible && acSelected >= 0) {
        e.preventDefault();
        selectItem(acItems[acSelected]);
      } else {
        e.preventDefault();
        execute();
      }
      return;
    }
    if (e.key === 'Escape') {
      hideAutocomplete();
      setMode('chat');
    }
  }

  // Form mode
  if (mode === 'form' && selectedCommand) {
    return (
      <Card elevated className="p-1.5 px-2 flex flex-col relative">
        <CommandForm
          command={selectedCommand}
          onExecute={handleFormExecute}
          onCancel={handleFormCancel}
        />
      </Card>
    );
  }

  // Chat or command-select mode
  return (
    <Card elevated className="py-1.5 px-2 flex gap-1 relative">
      {acVisible && (
        <div className={dropdown({ position: 'above' }) + ' max-h-37'}>
          {acItems.map((item, i) => (
            <div
              key={`${item.value}-${i}`}
              className={dropdownItem({ selected: i === acSelected })}
              onClick={() => selectItem(item)}
            >
              <span className={text({ variant: 'mono' })}>{item.name}</span>
              {item.desc && <span className={text({ variant: 'caption' }) + ' ml-1'}>{item.desc}</span>}
            </div>
          ))}
        </div>
      )}
      <Input
        ref={inputRef}
        size="lg"
        type="text"
        placeholder="Type a message, or / for commands"
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
