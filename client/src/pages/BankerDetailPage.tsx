import { useState, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useBankQuery } from '../hooks/useBankQuery';
import { useBankerHistory } from '../hooks/useBankerHistory';
import BankHistoryEntry from '../components/BankHistoryEntry';
import AppHeader from '../components/AppHeader';
import { Card, Input, Text, Badge, Heading } from '../ui';
import { text } from '../ui/recipes';

export default function BankerDetailPage() {
  const { banker } = useParams<{ banker: string }>();
  const { data, isLoading, error } = useBankQuery();
  const { data: history, isLoading: historyLoading } = useBankerHistory(banker);
  const [search, setSearch] = useState('');

  const bankerItems = useMemo(() => {
    if (!data || !banker) return [];
    return data
      .filter(item => item.bankers.includes(banker))
      .map(item => {
        const slots = item.slots.filter(s => s.banker === banker);
        const qty = slots.reduce((sum, s) => sum + s.quantity, 0);
        return { name: item.name, quantity: qty, slots };
      });
  }, [data, banker]);

  const filtered = useMemo(() => {
    if (!search) return bankerItems;
    const q = search.toLowerCase();
    return bankerItems.filter(item => item.name.toLowerCase().includes(q));
  }, [bankerItems, search]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  }, []);

  return (
    <div className="flex flex-1 flex-col overflow-hidden grain-overlay">
      <AppHeader />
      <div className="flex-1 overflow-y-auto relative z-0">
        <div className="max-w-content mx-auto py-3 px-3 pb-8 w-full flex flex-col gap-2 max-md:px-1.5 max-md:py-1.5 max-md:pb-14">
          <Link to="/bank" className="no-underline">
            <Text variant="caption" className="hover:text-accent transition-colors duration-fast">&lsaquo; Back to bank</Text>
          </Link>

          {error && <Text variant="error">{error instanceof Error ? error.message : 'Failed to fetch bank'}</Text>}
          {isLoading && <Text variant="caption" className="py-6 text-center block">Loading...</Text>}

          {!isLoading && data && (
            <>
              <div className="flex items-baseline gap-2 flex-wrap">
                <Heading level="heading">{banker}</Heading>
                <Text variant="caption">{bankerItems.length} unique items</Text>
              </div>

              <div className="flex gap-2 max-md:flex-col">
                {/* Item list — takes 2/3 on desktop */}
                <Card className="flex-[2] min-w-0">
                  <div className="flex items-center gap-1 py-1 px-2 border-b border-border">
                    <Input
                      variant="transparent"
                      size="sm"
                      type="text"
                      placeholder="Search items..."
                      value={search}
                      onChange={handleSearchChange}
                      autoFocus
                      className="w-full"
                    />
                  </div>
                  <div>
                    {filtered.map(item => (
                      <div key={item.name} className="border-b border-border last:border-b-0 flex items-center gap-2 py-1.5 px-2">
                        <span className="text-text font-body text-caption font-semibold flex-1 min-w-0 truncate">
                          {item.name}
                        </span>
                        <Badge variant="count" color="accent" className="shrink-0">
                          {item.quantity}x
                        </Badge>
                        <span className={text({ variant: 'caption' }) + ' shrink-0'}>
                          {item.slots.length} {item.slots.length === 1 ? 'slot' : 'slots'}
                        </span>
                      </div>
                    ))}
                    {filtered.length === 0 && (
                      <Text variant="caption" className="text-center py-4 block">
                        {bankerItems.length === 0 ? 'No items found for this banker' : 'No items match your search'}
                      </Text>
                    )}
                  </div>
                </Card>

                {/* Transaction history — takes 1/3 on desktop */}
                <Card className="flex-1 min-w-0 self-start">
                  <div className="flex items-center gap-2 py-1 px-2 border-b border-border">
                    <span className={text({ variant: 'overline' })}>TRANSACTION HISTORY</span>
                  </div>
                  <div>
                    {historyLoading && (
                      <Text variant="caption" className="text-center py-4 block">Loading...</Text>
                    )}
                    {!historyLoading && (!history || history.length === 0) && (
                      <Text variant="caption" className="text-center py-4 block">No imports yet</Text>
                    )}
                    {history?.map(record => (
                      <BankHistoryEntry key={record.id} record={record} />
                    ))}
                  </div>
                </Card>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
