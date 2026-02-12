import { useState, useRef, useCallback, type KeyboardEvent, type ChangeEvent } from 'react';
import { useSocket, type Command } from '../context/SocketContext';

interface AcItem {
  name: string;
  value: string;
  desc?: string;
}

export default function CommandInput() {
  const { commands, executeCommand, sendChat, fetchAutocomplete } = useSocket();

  const [value, setValue] = useState('');
  const [acItems, setAcItems] = useState<AcItem[]>([]);
  const [acSelected, setAcSelected] = useState(-1);
  const [acVisible, setAcVisible] = useState(false);
  const [helpHtml, setHelpHtml] = useState('');
  const [helpVisible, setHelpVisible] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const fetchTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const hideAutocomplete = useCallback(() => {
    setAcVisible(false);
    setAcItems([]);
    setAcSelected(-1);
  }, []);

  const hideHelp = useCallback(() => {
    setHelpVisible(false);
    setHelpHtml('');
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
  }

  function showCommandHelp(cmd: Command, currentOptionIndex: number) {
    if (!cmd.options || cmd.options.length === 0) {
      hideHelp();
      return;
    }
    const parts = cmd.options.map((opt, i) => {
      const cls = opt.required ? 'opt required' : 'opt';
      const marker = i === currentOptionIndex ? '\u25B6 ' : '';
      return `${marker}<span class="${cls}">${opt.name}</span>: ${opt.description}`;
    }).join(' | ');
    setHelpHtml(`/${cmd.name} \u2014 ${parts}`);
    setHelpVisible(true);
  }

  function selectItem(item: AcItem, currentValue: string) {
    const parts = currentValue.slice(1).split(/\s+/);
    let newVal: string;
    if (parts.length <= 1) {
      newVal = `/${item.value} `;
    } else {
      parts[parts.length - 1] = item.value;
      newVal = '/' + parts.join(' ') + ' ';
    }
    setValue(newVal);
    hideAutocomplete();
    // Trigger input processing after state update
    setTimeout(() => handleInputChange(newVal), 0);
    inputRef.current?.focus();
  }

  function handleInputChange(val: string) {
    if (val.startsWith('/')) {
      const parts = val.slice(1).split(/\s+/);
      const cmdName = parts[0].toLowerCase();

      if (parts.length === 1 && !val.includes(' ')) {
        showCommandAutocomplete(cmdName);
        hideHelp();
        return;
      }

      const cmd = commands.find(c => c.name === cmdName);
      if (cmd) {
        const argParts = parts.slice(1);
        const typingIndex = argParts.length - 1;
        const currentOptionIndex = typingIndex >= 0 && typingIndex < cmd.options.length ? typingIndex : -1;

        const currentOpt = cmd.options[currentOptionIndex];
        if (currentOpt?.autocomplete) {
          const currentValue = argParts[argParts.length - 1] || '';
          clearTimeout(fetchTimerRef.current);
          fetchTimerRef.current = setTimeout(async () => {
            const choices = await fetchAutocomplete(cmdName, currentOpt.name, currentValue);
            if (choices.length > 0) {
              setAcItems(choices.map((c: { name: string; value: string }) => ({ name: c.name, value: c.value, desc: '' })));
              setAcSelected(0);
              setAcVisible(true);
            } else {
              hideAutocomplete();
            }
          }, 100);
        } else {
          hideAutocomplete();
        }

        showCommandHelp(cmd, currentOptionIndex);
      }
    } else {
      hideAutocomplete();
      hideHelp();
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
      return;
    }

    hideAutocomplete();
    hideHelp();

    const parts = trimmed.slice(1).split(/\s+/);
    const cmdName = parts[0].toLowerCase();
    const cmd = commands.find(c => c.name === cmdName);

    if (!cmd) {
      // Unknown command - still clear input
      setValue('');
      return;
    }

    const options: Record<string, unknown> = {};
    for (let i = 0; i < cmd.options.length && i + 1 < parts.length; i++) {
      const opt = cmd.options[i];
      const v = parts[i + 1];
      if (opt.type === 'integer' || opt.type === 'number') {
        options[opt.name] = Number(v);
      } else if (opt.type === 'boolean') {
        options[opt.name] = v === 'true';
      } else {
        options[opt.name] = v;
      }
    }

    executeCommand(cmdName, options);
    setValue('');
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Tab' && acVisible) {
      e.preventDefault();
      if (acSelected >= 0 && acSelected < acItems.length) {
        selectItem(acItems[acSelected], value);
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
        selectItem(acItems[acSelected], value);
      } else {
        e.preventDefault();
        execute();
      }
      return;
    }
    if (e.key === 'Escape') {
      hideAutocomplete();
      hideHelp();
    }
  }

  return (
    <div className="input-area">
      {helpVisible && (
        <div
          className="command-help active"
          dangerouslySetInnerHTML={{ __html: helpHtml }}
        />
      )}
      {acVisible && (
        <div className="autocomplete active">
          {acItems.map((item, i) => (
            <div
              key={`${item.value}-${i}`}
              className={`ac-item ${i === acSelected ? 'selected' : ''}`}
              onClick={() => selectItem(item, value)}
            >
              <span className="ac-name">{item.name}</span>
              {item.desc && <span className="ac-desc">{item.desc}</span>}
            </div>
          ))}
        </div>
      )}
      <input
        ref={inputRef}
        type="text"
        className="command-input"
        placeholder="Type a message, or / for commands"
        autoComplete="off"
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
      />
      <button className="send-btn" onClick={execute}>Send</button>
    </div>
  );
}
