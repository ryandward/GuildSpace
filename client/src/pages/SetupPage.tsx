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
    <div className="setup-screen">
      <img src="/logo.svg" alt="GuildSpace" style={{ width: 80, height: 'auto', marginBottom: 8 }} />
      <h2>Welcome to GuildSpace</h2>
      <p style={{ color: 'var(--text-dim)', marginBottom: 16 }}>Choose your name</p>
      <input
        type="text"
        placeholder="Your GuildSpace name"
        maxLength={32}
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={handleKeyDown}
        autoFocus
      />
      {error && <p className="setup-error">{error}</p>}
      <button className="setup-btn" onClick={handleSubmit} disabled={submitting}>
        {submitting ? 'Setting up...' : "Let's go"}
      </button>
    </div>
  );
}
