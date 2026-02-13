import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AppHeader from '../components/AppHeader';
import CharacterCard from '../components/roster/CharacterCard';
import { Text, Heading, Card, Button, Textarea } from '../ui';
import { text } from '../ui/recipes';
import { cx } from 'class-variance-authority';

function classToPip(className: string): string {
  return 'pip-' + (className || '').toLowerCase().replace(/\s+/g, '-');
}

interface CharacterDkp {
  name: string;
  class: string;
  totalDkp: number;
  raidCount: number;
}

interface MemberDetail {
  discordId: string;
  displayName: string;
  bio: string | null;
  characters: {
    name: string;
    class: string;
    level: number;
    status: string;
    lastRaidDate: string | null;
  }[];
  earnedDkp: number;
  spentDkp: number;
  dkpByCharacter: CharacterDkp[];
}

export default function MemberDetailPage() {
  const { discordId } = useParams<{ discordId: string }>();
  const { token, user: authUser } = useAuth();
  const [data, setData] = useState<MemberDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Bio editing
  const [editingBio, setEditingBio] = useState(false);
  const [bioText, setBioText] = useState('');
  const [bioSaving, setBioSaving] = useState(false);

  const isOwnProfile = authUser?.id === discordId;

  useEffect(() => {
    if (!discordId) return;

    async function fetchMember() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/roster/${discordId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to fetch member');
        const json: MemberDetail = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch member');
      } finally {
        setLoading(false);
      }
    }

    fetchMember();
  }, [discordId, token]);

  const startEditBio = useCallback(() => {
    setBioText(data?.bio || '');
    setEditingBio(true);
  }, [data?.bio]);

  const saveBio = useCallback(async () => {
    setBioSaving(true);
    try {
      const res = await fetch('/api/profile/bio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ bio: bioText }),
      });
      if (!res.ok) throw new Error('Failed to save bio');
      const json = await res.json();
      setData(prev => prev ? { ...prev, bio: json.bio } : prev);
      setEditingBio(false);
    } catch {
      // keep editor open on failure
    } finally {
      setBioSaving(false);
    }
  }, [token, bioText]);

  const netDkp = data ? data.earnedDkp - data.spentDkp : 0;
  const maxDkp = useMemo(() => {
    if (!data?.dkpByCharacter.length) return 1;
    return Math.max(...data.dkpByCharacter.map(c => c.totalDkp), 1);
  }, [data]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden grain-overlay">
      <AppHeader />
      <div className="flex-1 overflow-y-auto relative z-0">
        <div className="max-w-content mx-auto py-3 px-3 pb-8 w-full flex flex-col gap-2 max-md:px-1.5 max-md:py-1.5 max-md:pb-5">
          <Link to="/roster" className="no-underline">
            <Text variant="caption" className="hover:text-accent transition-colors duration-fast">&lsaquo; Back to roster</Text>
          </Link>

          {error && <Text variant="error">{error}</Text>}
          {loading && <Text variant="caption" className="py-6 text-center block">Loading...</Text>}

          {!loading && data && (
            <>
              {/* Header */}
              <div className="flex items-baseline gap-2">
                <Heading level="heading">{data.displayName}</Heading>
                <span className={cx(text({ variant: 'mono' }), 'font-bold text-yellow')}>{netDkp} DKP</span>
              </div>

              {/* Bio */}
              {editingBio ? (
                <Card className="p-2 flex flex-col gap-1">
                  <Textarea
                    variant="surface"
                    size="sm"
                    rows={3}
                    maxLength={300}
                    placeholder="Write something about yourself..."
                    value={bioText}
                    onChange={e => setBioText(e.target.value)}
                    className="w-full resize-none"
                  />
                  <div className="flex items-center gap-1">
                    <Button size="sm" onClick={saveBio} disabled={bioSaving}>
                      {bioSaving ? 'Saving...' : 'Save'}
                    </Button>
                    <Button size="sm" intent="ghost" onClick={() => setEditingBio(false)}>Cancel</Button>
                    <Text variant="caption" className="ml-auto">{bioText.length}/300</Text>
                  </div>
                </Card>
              ) : data.bio ? (
                <Card className="p-2">
                  <Text variant="secondary" className="whitespace-pre-wrap">{data.bio}</Text>
                  {isOwnProfile && (
                    <button
                      className="bg-transparent border-none cursor-pointer mt-0.5 block"
                      onClick={startEditBio}
                    >
                      <Text variant="caption" className="hover:text-accent transition-colors duration-fast">Edit bio</Text>
                    </button>
                  )}
                </Card>
              ) : isOwnProfile ? (
                <button
                  className="bg-transparent border border-border-subtle border-dashed rounded-md py-1.5 px-2 cursor-pointer text-left hover:border-accent transition-colors duration-fast"
                  onClick={startEditBio}
                >
                  <Text variant="caption" className="text-text-dim">Add a bio...</Text>
                </button>
              ) : null}

              {/* DKP Summary */}
              <Card className="p-2 flex gap-4 max-md:flex-col max-md:gap-2">
                <div className="flex flex-col">
                  <Text variant="overline">Earned</Text>
                  <span className={cx(text({ variant: 'mono' }), 'font-bold text-green text-subheading')}>{data.earnedDkp}</span>
                </div>
                <div className="flex flex-col">
                  <Text variant="overline">Spent</Text>
                  <span className={cx(text({ variant: 'mono' }), 'font-bold text-red text-subheading')}>{data.spentDkp}</span>
                </div>
                <div className="flex flex-col">
                  <Text variant="overline">Net</Text>
                  <span className={cx(text({ variant: 'mono' }), 'font-bold text-yellow text-subheading')}>{netDkp}</span>
                </div>
              </Card>

              {/* Characters */}
              <Text variant="overline" className="mt-1">Characters</Text>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                {[...data.characters].sort((a, b) => {
                  const aDate = a.lastRaidDate ? new Date(a.lastRaidDate).getTime() : 0;
                  const bDate = b.lastRaidDate ? new Date(b.lastRaidDate).getTime() : 0;
                  if (bDate !== aDate) return bDate - aDate;
                  if (b.level !== a.level) return b.level - a.level;
                  const STATUS_ORDER: Record<string, number> = { Main: 0, Alt: 1, Bot: 2 };
                  const aStatus = STATUS_ORDER[a.status] ?? 3;
                  const bStatus = STATUS_ORDER[b.status] ?? 3;
                  if (aStatus !== bStatus) return aStatus - bStatus;
                  return a.name.localeCompare(b.name);
                }).map(c => (
                  <CharacterCard
                    key={c.name}
                    name={c.name}
                    class={c.class}
                    level={c.level}
                    status={c.status}
                    lastRaidDate={c.lastRaidDate}
                  />
                ))}
              </div>

              {/* DKP by Character — horizontal bar chart */}
              {data.dkpByCharacter.length > 0 && (
                <>
                  <Text variant="overline" className="mt-1">DKP Earned by Character</Text>
                  <Card className="p-2 flex flex-col gap-1.5">
                    {data.dkpByCharacter.map(c => (
                      <div key={c.name} className="flex flex-col gap-0.5">
                        <div className="flex items-baseline justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className={`w-0.5 h-2 rounded-full shrink-0 ${classToPip(c.class)}`} />
                            <Text variant="body" className="font-semibold truncate">{c.name}</Text>
                            <Text variant="label" className="truncate shrink-0">{c.class}</Text>
                          </div>
                          <div className="flex items-baseline gap-1.5 shrink-0">
                            <span className={cx(text({ variant: 'mono' }), 'font-bold text-yellow')}>{c.totalDkp}</span>
                            <Text variant="caption">{c.raidCount} raids</Text>
                          </div>
                        </div>
                        <div className="h-1 bg-surface-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${classToPip(c.class)} transition-all duration-slow`}
                            style={{ width: `${(c.totalDkp / maxDkp) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </Card>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
