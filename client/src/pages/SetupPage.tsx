import { useState, type KeyboardEvent } from 'react';
import { useAuth } from '../context/AuthContext';

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
    <div className="flex flex-col items-center justify-center flex-1 gap-4">
      <img src="/logo.svg" alt="GuildSpace" className="w-[80px] h-auto mb-2" />
      <h2 className="text-accent text-lg font-bold mb-2">Welcome to GuildSpace</h2>
      <p className="text-text-dim mb-4">Choose your name</p>
      <input
        type="text"
        placeholder="Your GuildSpace name"
        maxLength={32}
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={handleKeyDown}
        autoFocus
        className="bg-surface-2 border border-border text-text py-2.5 px-4 font-mono text-sm w-[280px] focus:outline-none focus:border-accent"
      />
      {error && <p className="text-red text-xs">{error}</p>}
      <button
        className="bg-accent text-bg border-none py-2.5 px-8 font-mono text-sm font-bold cursor-pointer"
        onClick={handleSubmit}
        disabled={submitting}
      >
        {submitting ? 'Setting up...' : "Let's go"}
      </button>
    </div>
  );
}
