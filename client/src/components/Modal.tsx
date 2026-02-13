import { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { Button, Heading } from '../ui';
import { Input, Textarea } from '../ui/Input';
import { modalOverlay, modalCard, text } from '../ui/recipes';

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
    <div className={modalOverlay()}>
      <div className={modalCard()}>
        <Heading level="heading" className="mb-2">{modal.title}</Heading>
        {modal.fields.map((field, i) => (
          <div key={field.customId}>
            <label className={text({ variant: 'label' }) + ' block mb-0.5'}>{field.label}</label>
            {field.style === 'paragraph' ? (
              <Textarea
                ref={el => setFieldRef(el, i)}
                variant="mono"
                size="sm"
                placeholder={field.placeholder || ''}
                value={fields[field.customId] || ''}
                onChange={e => setFields(f => ({ ...f, [field.customId]: e.target.value }))}
                className="w-full mb-1.5 min-h-19 resize-y"
              />
            ) : (
              <Input
                ref={el => setFieldRef(el, i)}
                size="lg"
                type="text"
                placeholder={field.placeholder || ''}
                value={fields[field.customId] || ''}
                onChange={e => setFields(f => ({ ...f, [field.customId]: e.target.value }))}
                className="w-full mb-1.5"
              />
            )}
          </div>
        ))}
        <div className="flex gap-1 justify-end mt-1.5">
          <Button intent="danger" size="md" onClick={closeModal}>Cancel</Button>
          <Button intent="success" size="md" onClick={handleSubmit}>Submit</Button>
        </div>
      </div>
    </div>
  );
}
