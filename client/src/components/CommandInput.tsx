import { useState, useRef, useCallback, type KeyboardEvent, type ChangeEvent } from 'react';
import { useSocket, type Command } from '../context/SocketContext';
import CommandForm from './CommandForm';

interface AcItem {
  name: string;
  value: string;
  desc?: string;
}

type InputMode = 'chat' | 'command-select' | 'form';

export default function CommandInput() {
  const { commands, executeCommand, sendChat, fetchAutocomplete } = useSocket();

  const [mode, setMode] = useState<InputMode>('chat');
  const [value, setValue] = useState('');
  const [acItems, setAcItems] = useState<AcItem[]>([]);
  const [acSelected, setAcSelected] = useState(-1);
  const [acVisible, setAcVisible] = useState(false);
  const [selectedCommand, setSelectedCommand] = useState<Command | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const fetchTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

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
      <div className="bg-surface border-t border-border p-2.5 px-5 flex flex-col relative">
        <CommandForm
          command={selectedCommand}
          onExecute={handleFormExecute}
          onCancel={handleFormCancel}
        />
      </div>
    );
  }

  // Chat or command-select mode
  return (
    <div className="bg-surface border-t border-border py-3 px-5 flex gap-2 relative">
      {acVisible && (
        <div className="absolute bottom-full left-5 right-5 bg-surface border border-border max-h-[300px] overflow-y-auto">
          {acItems.map((item, i) => (
            <div
              key={`${item.value}-${i}`}
              className={`py-2 px-3.5 cursor-pointer text-xs border-b border-border ${i === acSelected ? 'bg-surface-2' : 'hover:bg-surface-2'}`}
              onClick={() => selectItem(item)}
            >
              <span className="text-text">{item.name}</span>
              {item.desc && <span className="text-text-dim text-xs ml-2">{item.desc}</span>}
            </div>
          ))}
        </div>
      )}
      <input
        ref={inputRef}
        type="text"
        className="flex-1 bg-bg border border-border text-text font-mono text-sm py-2.5 px-3.5 focus:outline-none focus:border-accent placeholder:text-text-dim"
        placeholder="Type a message, or / for commands"
        autoComplete="off"
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
      />
      <button
        className="bg-accent text-bg border-none py-2.5 px-5 font-mono text-sm font-bold cursor-pointer"
        onClick={execute}
      >
        Send
      </button>
    </div>
  );
}
