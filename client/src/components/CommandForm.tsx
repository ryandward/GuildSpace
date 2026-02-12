import { useState, useRef, useEffect, useCallback, type KeyboardEvent, type ChangeEvent } from 'react';
import { useSocket, type Command, type CommandOption, type AutocompleteChoice, type ToonInfo } from '../context/SocketContext';

interface CommandFormProps {
  command: Command;
  onExecute: (options: Record<string, unknown>) => void;
  onCancel: () => void;
}

interface FieldState {
  value: string;
  prefilledBy?: string;
}

export default function CommandForm({ command, onExecute, onCancel }: CommandFormProps) {
  const { fetchAutocomplete, fetchMyToons } = useSocket();

  const [fields, setFields] = useState<Record<string, FieldState>>(() => {
    const init: Record<string, FieldState> = {};
    for (const opt of command.options) {
      init[opt.name] = { value: '' };
    }
    return init;
  });

  const [acChoices, setAcChoices] = useState<AutocompleteChoice[]>([]);
  const [acSelected, setAcSelected] = useState(-1);
  const [acField, setAcField] = useState<string | null>(null);

  const [toonPickerOpen, setToonPickerOpen] = useState(false);
  const [myToons, setMyToons] = useState<ToonInfo[]>([]);
  const [toonFilter, setToonFilter] = useState('');
  const [toonSelected, setToonSelected] = useState(0);

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const fieldRefs = useRef<Record<string, HTMLInputElement | HTMLSelectElement | null>>({});
  const fetchTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const formRef = useRef<HTMLDivElement>(null);

  const nameOpt = command.options.find(o => o.name === 'name');
  const isCreateCommand = nameOpt && !nameOpt.autocomplete;

  // Focus first field on mount; if it's autocomplete, trigger initial fetch
  useEffect(() => {
    const firstOpt = command.options[0];
    if (firstOpt) {
      const el = fieldRefs.current[firstOpt.name];
      el?.focus();
      if (firstOpt.autocomplete) {
        triggerAutocomplete(firstOpt, '');
      }
    }
  }, [command]);

  const hideAutocomplete = useCallback(() => {
    setAcChoices([]);
    setAcSelected(-1);
    setAcField(null);
  }, []);

  function setFieldValue(name: string, value: string, prefilledBy?: string) {
    setFields(prev => ({ ...prev, [name]: { value, prefilledBy } }));
    setValidationErrors(prev => {
      if (prev[name]) {
        const next = { ...prev };
        delete next[name];
        return next;
      }
      return prev;
    });
  }

  function applyMetadata(metadata: Record<string, string | number>) {
    setFields(prev => {
      const next = { ...prev };
      for (const opt of command.options) {
        if (metadata[opt.name] != null) {
          next[opt.name] = { value: String(metadata[opt.name]), prefilledBy: 'autocomplete' };
        }
      }
      return next;
    });
  }

  function applyToon(toon: ToonInfo) {
    setFields(prev => {
      const next = { ...prev };
      for (const opt of command.options) {
        if (opt.name === 'level' && toon.level != null) {
          next[opt.name] = { value: String(toon.level), prefilledBy: 'toon-copy' };
        } else if (opt.name === 'class' && toon.class) {
          next[opt.name] = { value: toon.class, prefilledBy: 'toon-copy' };
        } else if (opt.name === 'status' && toon.status) {
          next[opt.name] = { value: toon.status, prefilledBy: 'toon-copy' };
        }
      }
      return next;
    });
    setToonPickerOpen(false);
    setToonFilter('');
    fieldRefs.current['name']?.focus();
  }

  async function openToonPicker() {
    const toons = await fetchMyToons();
    setMyToons(toons);
    setToonPickerOpen(true);
    setToonSelected(0);
    setToonFilter('');
  }

  function triggerAutocomplete(opt: CommandOption, val: string) {
    clearTimeout(fetchTimerRef.current);
    setAcField(opt.name);
    fetchTimerRef.current = setTimeout(async () => {
      const choices = await fetchAutocomplete(command.name, opt.name, val);
      if (choices.length > 0) {
        setAcChoices(choices);
        setAcSelected(0);
        setAcField(opt.name);
      } else {
        hideAutocomplete();
      }
    }, val ? 100 : 0); // immediate on focus, debounced on typing
  }

  function handleAutocompleteSelect(choice: AutocompleteChoice, optName: string) {
    setFieldValue(optName, choice.value);
    if (choice.metadata) {
      applyMetadata(choice.metadata);
    }
    hideAutocomplete();
    // Advance to next unfilled field, or submit if all filled
    const idx = command.options.findIndex(o => o.name === optName);
    const nextOpt = command.options[idx + 1];
    if (nextOpt) {
      setTimeout(() => fieldRefs.current[nextOpt.name]?.focus(), 0);
    }
  }

  function handleFieldFocus(opt: CommandOption) {
    if (opt.autocomplete) {
      const val = fields[opt.name]?.value || '';
      triggerAutocomplete(opt, val);
    }
  }

  async function handleFieldChange(opt: CommandOption, val: string) {
    setFieldValue(opt.name, val);
    if (opt.autocomplete) {
      triggerAutocomplete(opt, val);
    }
  }

  function validate(): boolean {
    const errors: Record<string, string> = {};
    for (const opt of command.options) {
      const val = fields[opt.name]?.value;
      if (opt.required && (!val || val.trim() === '')) {
        errors[opt.name] = 'Required';
      }
      if (val && (opt.type === 'integer' || opt.type === 'number')) {
        const num = Number(val);
        if (isNaN(num)) {
          errors[opt.name] = 'Must be a number';
        } else {
          if (opt.minValue != null && num < opt.minValue) errors[opt.name] = `Min ${opt.minValue}`;
          if (opt.maxValue != null && num > opt.maxValue) errors[opt.name] = `Max ${opt.maxValue}`;
        }
      }
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    const options: Record<string, unknown> = {};
    for (const opt of command.options) {
      const val = fields[opt.name]?.value;
      if (val == null || val === '') continue;
      if (opt.type === 'integer') options[opt.name] = parseInt(val, 10);
      else if (opt.type === 'number') options[opt.name] = parseFloat(val);
      else if (opt.type === 'boolean') options[opt.name] = val === 'true';
      else options[opt.name] = val;
    }
    onExecute(options);
  }

  function handleKeyDown(e: KeyboardEvent, opt: CommandOption, optIndex: number) {
    if (acField === opt.name && acChoices.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setAcSelected(s => Math.min(s + 1, acChoices.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setAcSelected(s => Math.max(s - 1, 0));
        return;
      }
      if (e.key === 'Tab' || e.key === 'Enter') {
        if (acSelected >= 0 && acSelected < acChoices.length) {
          e.preventDefault();
          handleAutocompleteSelect(acChoices[acSelected], opt.name);
          return;
        }
      }
    }

    if (e.key === 'Escape') {
      if (acField) {
        hideAutocomplete();
      } else {
        onCancel();
      }
      return;
    }

    if (e.key === 'Enter' && !acField) {
      e.preventDefault();
      const nextOpt = command.options[optIndex + 1];
      if (nextOpt) {
        fieldRefs.current[nextOpt.name]?.focus();
      } else {
        handleSubmit();
      }
      return;
    }
  }

  function handleToonPickerKeyDown(e: KeyboardEvent) {
    const filtered = myToons.filter(t =>
      t.name.toLowerCase().includes(toonFilter.toLowerCase())
    );
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setToonSelected(s => Math.min(s + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setToonSelected(s => Math.max(s - 1, 0));
    } else if (e.key === 'Enter' && filtered[toonSelected]) {
      e.preventDefault();
      applyToon(filtered[toonSelected]);
    } else if (e.key === 'Escape') {
      setToonPickerOpen(false);
      setToonFilter('');
    }
  }

  const filteredToons = myToons.filter(t =>
    t.name.toLowerCase().includes(toonFilter.toLowerCase())
  );

  function renderField(opt: CommandOption, idx: number) {
    const fieldState = fields[opt.name] || { value: '' };
    const error = validationErrors[opt.name];
    const isPrefilled = !!fieldState.prefilledBy;

    if (opt.choices && opt.choices.length > 0) {
      return (
        <div className="command-form-field" key={opt.name}>
          <label className="command-form-label">
            {opt.name}{opt.required && <span className="command-form-required">*</span>}
            <span className="command-form-desc">{opt.description}</span>
          </label>
          <select
            ref={el => { fieldRefs.current[opt.name] = el; }}
            className={`command-form-select${error ? ' error' : ''}${isPrefilled ? ' prefilled' : ''}`}
            value={fieldState.value}
            onChange={(e) => setFieldValue(opt.name, e.target.value)}
            onKeyDown={(e) => handleKeyDown(e as unknown as KeyboardEvent, opt, idx)}
          >
            <option value="">-- select --</option>
            {opt.choices.map(c => (
              <option key={String(c.value)} value={String(c.value)}>{c.name}</option>
            ))}
          </select>
          {error && <span className="command-form-error">{error}</span>}
        </div>
      );
    }

    if (opt.autocomplete) {
      return (
        <div className="command-form-field" key={opt.name}>
          <label className="command-form-label">
            {opt.name}{opt.required && <span className="command-form-required">*</span>}
            <span className="command-form-desc">{opt.description}</span>
          </label>
          <div className="command-form-ac-wrap">
            {acField === opt.name && acChoices.length > 0 && (
              <div className="command-form-ac-dropdown">
                {acChoices.map((c, i) => (
                  <div
                    key={`${c.value}-${i}`}
                    className={`command-form-ac-item${i === acSelected ? ' selected' : ''}`}
                    onMouseDown={() => handleAutocompleteSelect(c, opt.name)}
                  >
                    <span className="ac-name">{c.name}</span>
                    {c.metadata && (
                      <span className="ac-meta">
                        Lv{c.metadata.level} {c.metadata.class}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
            <input
              ref={el => { fieldRefs.current[opt.name] = el; }}
              type="text"
              className={`command-form-input${error ? ' error' : ''}`}
              value={fieldState.value}
              placeholder={opt.description}
              autoComplete="off"
              onFocus={() => handleFieldFocus(opt)}
              onChange={(e) => handleFieldChange(opt, e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, opt, idx)}
              onBlur={() => setTimeout(hideAutocomplete, 150)}
            />
          </div>
          {error && <span className="command-form-error">{error}</span>}
        </div>
      );
    }

    if (opt.type === 'integer' || opt.type === 'number') {
      return (
        <div className="command-form-field" key={opt.name}>
          <label className="command-form-label">
            {opt.name}{opt.required && <span className="command-form-required">*</span>}
            <span className="command-form-desc">
              {opt.description}
              {opt.minValue != null && opt.maxValue != null && ` (${opt.minValue}--${opt.maxValue})`}
            </span>
          </label>
          <input
            ref={el => { fieldRefs.current[opt.name] = el; }}
            type="number"
            className={`command-form-input command-form-number${error ? ' error' : ''}${isPrefilled ? ' prefilled' : ''}`}
            value={fieldState.value}
            placeholder={opt.description}
            min={opt.minValue}
            max={opt.maxValue}
            onChange={(e) => setFieldValue(opt.name, e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, opt, idx)}
          />
          {error && <span className="command-form-error">{error}</span>}
        </div>
      );
    }

    if (opt.type === 'boolean') {
      return (
        <div className="command-form-field" key={opt.name}>
          <label className="command-form-label">
            {opt.name}{opt.required && <span className="command-form-required">*</span>}
            <span className="command-form-desc">{opt.description}</span>
          </label>
          <select
            ref={el => { fieldRefs.current[opt.name] = el; }}
            className={`command-form-select${error ? ' error' : ''}`}
            value={fieldState.value}
            onChange={(e) => setFieldValue(opt.name, e.target.value)}
            onKeyDown={(e) => handleKeyDown(e as unknown as KeyboardEvent, opt, idx)}
          >
            <option value="">-- select --</option>
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
          {error && <span className="command-form-error">{error}</span>}
        </div>
      );
    }

    return (
      <div className="command-form-field" key={opt.name}>
        <label className="command-form-label">
          {opt.name}{opt.required && <span className="command-form-required">*</span>}
          <span className="command-form-desc">{opt.description}</span>
        </label>
        <input
          ref={el => { fieldRefs.current[opt.name] = el; }}
          type="text"
          className={`command-form-input${error ? ' error' : ''}${isPrefilled ? ' prefilled' : ''}`}
          value={fieldState.value}
          placeholder={opt.description}
          autoComplete="off"
          onChange={(e) => setFieldValue(opt.name, e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, opt, idx)}
        />
        {error && <span className="command-form-error">{error}</span>}
      </div>
    );
  }

  return (
    <div className="command-form" ref={formRef}>
      <div className="command-form-header">
        <span className="command-form-title">/{command.name}</span>
        <span className="command-form-desc-header">{command.description}</span>
        <button className="command-form-cancel" onClick={onCancel} title="Cancel (Esc)">Esc</button>
      </div>

      {isCreateCommand && (
        <button className="command-form-copy-btn" onClick={openToonPicker} type="button">
          Copy from existing toon
        </button>
      )}

      {toonPickerOpen && (
        <div className="command-form-toon-picker">
          <input
            type="text"
            className="command-form-input"
            placeholder="Filter characters..."
            value={toonFilter}
            autoFocus
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              setToonFilter(e.target.value);
              setToonSelected(0);
            }}
            onKeyDown={handleToonPickerKeyDown}
          />
          <div className="command-form-toon-list">
            {filteredToons.length === 0 && (
              <div className="command-form-toon-empty">No characters found</div>
            )}
            {filteredToons.map((t, i) => (
              <div
                key={t.name}
                className={`command-form-toon-item${i === toonSelected ? ' selected' : ''}`}
                onClick={() => applyToon(t)}
              >
                <span className="toon-name">{t.name}</span>
                <span className="toon-detail">Lv{t.level} {t.class}</span>
                <span className="toon-status">{t.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="command-form-fields">
        {command.options.map((opt, idx) => renderField(opt, idx))}
      </div>

      <div className="command-form-actions">
        <button className="command-form-submit" onClick={handleSubmit}>Execute</button>
        <span className="command-form-hint">Enter to submit, Esc to cancel</span>
      </div>
    </div>
  );
}
