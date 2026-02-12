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
    <div className="modal-overlay active">
      <div className="modal-box">
        <h3>{modal.title}</h3>
        {modal.fields.map((field, i) => (
          <div key={field.customId}>
            <label>{field.label}</label>
            {field.style === 'paragraph' ? (
              <textarea
                ref={el => setFieldRef(el, i)}
                placeholder={field.placeholder || ''}
                value={fields[field.customId] || ''}
                onChange={e => setFields(f => ({ ...f, [field.customId]: e.target.value }))}
              />
            ) : (
              <input
                ref={el => setFieldRef(el, i)}
                type="text"
                placeholder={field.placeholder || ''}
                value={fields[field.customId] || ''}
                onChange={e => setFields(f => ({ ...f, [field.customId]: e.target.value }))}
              />
            )}
          </div>
        ))}
        <div className="modal-actions">
          <button className="comp-button style-Danger" onClick={closeModal}>Cancel</button>
          <button className="comp-button style-Success" onClick={handleSubmit}>Submit</button>
        </div>
      </div>
    </div>
  );
}
