import { useState, type KeyboardEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button, Heading, Text } from '../ui';
import { Input } from '../ui/Input';

export default function SetupPage() {
  const { submitName } = useAuth();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }
    setSubmitting(true);
    setError(null);
    const err = await submitName(trimmed);
    setSubmitting(false);
    if (err) setError(err);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') handleSubmit();
  }

  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-2">
      <img src="/logo.svg" alt="GuildSpace" className="w-10 h-auto mb-1" />
      <Heading level="heading" className="mb-1">Welcome to GuildSpace</Heading>
      <Text variant="secondary" className="text-center max-w-40 mb-2">
        Pick a name your guildmates will recognize — your main's name, your Discord nickname, anything but a number.
      </Text>
      <Input
        variant="surface"
        size="lg"
        type="text"
        placeholder="Your GuildSpace name"
        maxLength={32}
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={handleKeyDown}
        autoFocus
        className="w-35"
      />
      {error && <Text variant="error">{error}</Text>}
      <Button intent="primary" size="xl" onClick={handleSubmit} disabled={submitting}>
        {submitting ? 'Setting up...' : "Let's go"}
      </Button>
    </div>
  );
}
