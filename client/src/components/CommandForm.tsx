import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from 'react';
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

  // Client-side toon cache for create commands
  const [myToons, setMyToons] = useState<ToonInfo[]>([]);

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const fieldRefs = useRef<Record<string, HTMLInputElement | HTMLSelectElement | null>>({});
  const fetchTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const formRef = useRef<HTMLDivElement>(null);

  const nameOpt = command.options.find(o => o.name === 'name');
  const isCreateCommand = nameOpt && !nameOpt.autocomplete;

  // Pre-fetch user's toons for create commands so name field can autocomplete client-side
  useEffect(() => {
    if (isCreateCommand) {
      fetchMyToons().then(setMyToons);
    }
  }, [isCreateCommand]);

  // Focus first field on mount; trigger autocomplete if applicable
  useEffect(() => {
    const firstOpt = command.options[0];
    if (firstOpt) {
      fieldRefs.current[firstOpt.name]?.focus();
      if (firstOpt.autocomplete) {
        triggerServerAutocomplete(firstOpt, '');
      } else if (isCreateCommand && firstOpt.name === 'name') {
        // Show all toons immediately for create commands
        showClientAutocomplete('name', '');
      }
    }
  }, [command, myToons]);

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

  function applyToonToSiblings(toon: ToonInfo) {
    setFields(prev => {
      const next = { ...prev };
      for (const opt of command.options) {
        if (opt.name === 'name') continue; // don't overwrite the name they're typing
        if (opt.name === 'level' && toon.level != null) {
          next[opt.name] = { value: String(toon.level), prefilledBy: 'autocomplete' };
        } else if (opt.name === 'class' && toon.class) {
          next[opt.name] = { value: toon.class, prefilledBy: 'autocomplete' };
        } else if (opt.name === 'status' && toon.status) {
          next[opt.name] = { value: toon.status, prefilledBy: 'autocomplete' };
        }
      }
      return next;
    });
  }

  // Client-side autocomplete for create commands (filters pre-fetched toons)
  function showClientAutocomplete(optName: string, val: string) {
    if (myToons.length === 0) return;
    const lower = val.toLowerCase();
    const filtered = lower
      ? myToons.filter(t => t.name.toLowerCase().includes(lower))
      : myToons;
    if (filtered.length > 0) {
      setAcChoices(filtered.map(t => ({
        name: t.name,
        value: t.name,
        metadata: { level: t.level, class: t.class, status: t.status },
      })));
      setAcSelected(0);
      setAcField(optName);
    } else {
      hideAutocomplete();
    }
  }

  // Server-side autocomplete for update commands
  function triggerServerAutocomplete(opt: CommandOption, val: string) {
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
    }, val ? 100 : 0);
  }

  function handleAutocompleteSelect(choice: AutocompleteChoice, optName: string) {
    if (isCreateCommand && optName === 'name') {
      // For create commands: fill siblings from toon data, but set name too as starting point
      setFieldValue(optName, choice.value);
      const toon = myToons.find(t => t.name === choice.value);
      if (toon) applyToonToSiblings(toon);
    } else {
      // For update commands: set name and fill siblings from metadata
      setFieldValue(optName, choice.value);
      if (choice.metadata) applyMetadata(choice.metadata);
    }
    hideAutocomplete();
    const idx = command.options.findIndex(o => o.name === optName);
    const nextOpt = command.options[idx + 1];
    if (nextOpt) {
      setTimeout(() => fieldRefs.current[nextOpt.name]?.focus(), 0);
    }
  }

  function handleFieldFocus(opt: CommandOption) {
    if (opt.autocomplete) {
      triggerServerAutocomplete(opt, fields[opt.name]?.value || '');
    } else if (isCreateCommand && opt.name === 'name') {
      showClientAutocomplete('name', fields['name']?.value || '');
    }
  }

  function handleFieldChange(opt: CommandOption, val: string) {
    setFieldValue(opt.name, val);
    if (opt.autocomplete) {
      triggerServerAutocomplete(opt, val);
    } else if (isCreateCommand && opt.name === 'name') {
      showClientAutocomplete('name', val);
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

  // Unified field renderer: name fields on create commands get client-side autocomplete
  function hasAutocompleteUI(opt: CommandOption): boolean {
    return opt.autocomplete || (isCreateCommand && opt.name === 'name') || false;
  }

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

    if (hasAutocompleteUI(opt)) {
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
