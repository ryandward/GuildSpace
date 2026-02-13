import { useState, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useBankQuery } from '../hooks/useBankQuery';
import { useBankerHistory, type BankImportRecord } from '../hooks/useBankerHistory';
import AppHeader from '../components/AppHeader';
import { Card, Input, Text, Badge, Heading } from '../ui';
import { text } from '../ui/recipes';

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function HistoryEntry({ record }: { record: BankImportRecord }) {
  const [expanded, setExpanded] = useState(false);
  const { added, removed, changed } = record.diff;
  const hasChanges = added.length > 0 || removed.length > 0 || changed.length > 0;

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        className="w-full flex items-center gap-1.5 py-1.5 px-2 bg-transparent border-none cursor-pointer text-left hover:bg-surface-2 transition-colors duration-fast"
        onClick={() => setExpanded(!expanded)}
        disabled={!hasChanges}
      >
        {hasChanges && (
          <span
            className="collapse-chevron text-text-dim text-caption shrink-0"
            data-expanded={expanded}
          >
            ›
          </span>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-text font-body text-caption truncate">
            <span className="font-semibold">{record.uploadedByName}</span>
            {' imported '}
            <span className="font-semibold">{record.itemCount}</span>
            {' items'}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={text({ variant: 'caption' })}>{timeAgo(record.createdAt)}</span>
            {hasChanges && (
              <span className={text({ variant: 'caption' })}>
                {added.length > 0 && <span className="text-green">+{added.length}</span>}
                {added.length > 0 && (removed.length > 0 || changed.length > 0) && ' '}
                {removed.length > 0 && <span className="text-red">-{removed.length}</span>}
                {removed.length > 0 && changed.length > 0 && ' '}
                {changed.length > 0 && <span className="text-accent">{changed.length} changed</span>}
              </span>
            )}
          </div>
        </div>
      </button>
      {hasChanges && (
        <div className="collapse-container" data-expanded={expanded}>
          <div className="collapse-inner">
            <div className="px-2 pb-1.5 pt-0.5 ml-3 border-l border-border-subtle flex flex-col gap-px">
              {added.map(item => (
                <div key={item.name} className="text-caption font-body text-green truncate">
                  +{item.quantity} {item.name}
                </div>
              ))}
              {removed.map(item => (
                <div key={item.name} className="text-caption font-body text-red truncate">
                  -{item.quantity} {item.name}
                </div>
              ))}
              {changed.map(item => (
                <div key={item.name} className="text-caption font-body text-text-dim truncate">
                  {item.name}: {item.oldQuantity} → {item.newQuantity}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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

                {/* Import history — takes 1/3 on desktop */}
                <Card className="flex-1 min-w-0 self-start">
                  <div className="flex items-center gap-2 py-1 px-2 border-b border-border">
                    <span className={text({ variant: 'overline' })}>IMPORT HISTORY</span>
                  </div>
                  <div>
                    {historyLoading && (
                      <Text variant="caption" className="text-center py-4 block">Loading...</Text>
                    )}
                    {!historyLoading && history && history.length === 0 && (
                      <Text variant="caption" className="text-center py-4 block">No imports yet</Text>
                    )}
                    {history?.map(record => (
                      <HistoryEntry key={record.id} record={record} />
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
