import { useState } from 'react';
import { Button, Input, Select, Textarea, Text } from '../../ui';
import type { RaidTemplate } from '../../hooks/useRaidTemplatesQuery';

interface Props {
  templates: RaidTemplate[];
  onSubmit: (params: { raidName: string; modifier: number; whoLog: string }) => void;
  onCancel: () => void;
  isPending: boolean;
}

export default function AddCallForm({ templates, onSubmit, onCancel, isPending }: Props) {
  const [raidName, setRaidName] = useState('');
  const [modifier, setModifier] = useState('');
  const [whoLog, setWhoLog] = useState('');

  function handleTemplateChange(value: string) {
    const tmpl = templates.find(t => t.name === value);
    if (tmpl) {
      setRaidName(tmpl.name);
      setModifier(String(tmpl.modifier));
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const mod = Number(modifier);
    if (!raidName.trim() || isNaN(mod) || !whoLog.trim()) return;
    onSubmit({ raidName: raidName.trim(), modifier: mod, whoLog: whoLog.trim() });
  }

  return (
    <form onSubmit={handleSubmit} className="p-2 flex flex-col gap-1.5">
      <div className="flex gap-1 max-md:flex-col">
        <div className="flex-1 flex flex-col gap-0.5">
          <Text variant="label">Raid Template</Text>
          <Select
            size="sm"
            value=""
            onChange={(e) => handleTemplateChange(e.target.value)}
          >
            <option value="">Pick a template...</option>
            {templates.map(t => (
              <option key={t.name} value={t.name}>
                {t.name} ({t.modifier} DKP)
              </option>
            ))}
          </Select>
        </div>
        <div className="flex-1 flex flex-col gap-0.5">
          <Text variant="label">Raid Name</Text>
          <Input
            size="sm"
            type="text"
            placeholder="Custom name or from template"
            value={raidName}
            onChange={(e) => setRaidName(e.target.value)}
          />
        </div>
        <div className="w-20 max-md:w-full flex flex-col gap-0.5">
          <Text variant="label">DKP</Text>
          <Input
            size="sm"
            type="number"
            placeholder="10"
            value={modifier}
            onChange={(e) => setModifier(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-0.5">
        <Text variant="label">Paste /who output</Text>
        <Textarea
          size="sm"
          rows={6}
          placeholder="[Thu Feb 13 20:16:36 2026] [60 Warlock] Azrosaurus (Iksar) <Ex Astra>"
          value={whoLog}
          onChange={(e) => setWhoLog(e.target.value)}
          className="font-mono text-micro"
        />
      </div>

      <div className="flex items-center gap-1">
        <Button
          intent="primary"
          size="sm"
          type="submit"
          disabled={isPending || !raidName.trim() || !modifier || !whoLog.trim()}
        >
          {isPending ? 'Processing...' : 'Submit Call'}
        </Button>
        <Button intent="ghost" size="sm" onClick={onCancel} type="button">
          Cancel
        </Button>
      </div>
    </form>
  );
}
