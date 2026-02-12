import { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';

export default function Modal() {
  const { modal, closeModal, submitModal } = useSocket();
  const [fields, setFields] = useState<Record<string, string>>({});
  const firstFieldRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);

  useEffect(() => {
    if (modal) {
      const initial: Record<string, string> = {};
      for (const f of modal.fields) {
        initial[f.customId] = '';
      }
      setFields(initial);
      setTimeout(() => firstFieldRef.current?.focus(), 100);
    }
  }, [modal]);

  if (!modal) return null;

  function handleSubmit() {
    submitModal(modal!.customId, fields);
  }

  function setFieldRef(el: HTMLTextAreaElement | HTMLInputElement | null, index: number) {
    if (index === 0) firstFieldRef.current = el;
  }

  return (
    <div className="fixed inset-0 bg-black/75 z-[100] flex items-center justify-center">
      <div className="bg-surface border border-border p-6 max-w-[600px] w-[90%]">
        <h3 className="mb-4 text-accent text-[15px] font-bold">{modal.title}</h3>
        {modal.fields.map((field, i) => (
          <div key={field.customId}>
            <label className="block mb-1 text-text-dim text-xs">{field.label}</label>
            {field.style === 'paragraph' ? (
              <textarea
                ref={el => setFieldRef(el, i)}
                placeholder={field.placeholder || ''}
                value={fields[field.customId] || ''}
                onChange={e => setFields(f => ({ ...f, [field.customId]: e.target.value }))}
                className="w-full bg-bg border border-border text-text font-mono text-xs p-2 mb-3 min-h-[150px] resize-y focus:outline-none focus:border-accent"
              />
            ) : (
              <input
                ref={el => setFieldRef(el, i)}
                type="text"
                placeholder={field.placeholder || ''}
                value={fields[field.customId] || ''}
                onChange={e => setFields(f => ({ ...f, [field.customId]: e.target.value }))}
                className="w-full bg-bg border border-border text-text font-mono text-xs p-2 mb-3 focus:outline-none focus:border-accent"
              />
            )}
          </div>
        ))}
        <div className="flex gap-2 justify-end mt-3">
          <button
            className="py-1.5 px-4 border border-red text-red bg-surface-2 font-mono text-xs cursor-pointer hover:bg-border"
            onClick={closeModal}
          >
            Cancel
          </button>
          <button
            className="py-1.5 px-4 border border-green text-green bg-surface-2 font-mono text-xs cursor-pointer hover:bg-border"
            onClick={handleSubmit}
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}
