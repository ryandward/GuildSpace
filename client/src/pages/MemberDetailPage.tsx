import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AppHeader from '../components/AppHeader';
import CharacterCard from '../components/roster/CharacterCard';
import { Text, Heading, Card } from '../ui';
import { text } from '../ui/recipes';
import { cx } from 'class-variance-authority';

interface MemberDetail {
  discordId: string;
  displayName: string;
  characters: {
    name: string;
    class: string;
    level: number;
    status: string;
    lastRaidDate: string | null;
  }[];
  earnedDkp: number;
  spentDkp: number;
  recentAttendance: {
    raid: string | null;
    characterName: string | null;
    date: string | null;
    modifier: number;
  }[];
}

export default function MemberDetailPage() {
  const { discordId } = useParams<{ discordId: string }>();
  const { token } = useAuth();
  const [data, setData] = useState<MemberDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const netDkp = data ? data.earnedDkp - data.spentDkp : 0;

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
                {data.characters.map(c => (
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

              {/* Recent Attendance */}
              {data.recentAttendance.length > 0 && (
                <>
                  <Text variant="overline" className="mt-1">Recent Attendance</Text>
                  <Card className="overflow-hidden">
                    <div className="flex flex-col">
                      {data.recentAttendance.map((a, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 py-1 px-2 border-b border-border-subtle last:border-b-0"
                        >
                          <Text variant="body" className="font-semibold flex-1 truncate">{a.raid}</Text>
                          <Text variant="label" className="truncate max-md:hidden">{a.characterName}</Text>
                          <span className={cx(text({ variant: 'mono' }), 'text-text-dim shrink-0')}>
                            +{a.modifier}
                          </span>
                          <Text variant="caption" className="shrink-0">
                            {a.date ? new Date(a.date).toLocaleDateString() : ''}
                          </Text>
                        </div>
                      ))}
                    </div>
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
