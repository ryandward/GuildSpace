import { useState, useMemo, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useBankQuery, type BankItem } from '../hooks/useBankQuery';
import { useBankImport } from '../hooks/useBankImport';
import { useBankHistory } from '../hooks/useBankerHistory';
import BankHistoryEntry from '../components/BankHistoryEntry';
import BankerTreemap from '../components/bank/BankerTreemap';
import CollapsibleCard from '../components/CollapsibleCard';
import AppHeader from '../components/AppHeader';
import { Card, Input, Text, Badge, Button } from '../ui';
import { text } from '../ui/recipes';

function BankItemRow({ item }: { item: BankItem }) {
  const [expanded, setExpanded] = useState(false);

  const bankerGroups = useMemo(() => {
    const groups = new Map<string, { location: string; quantity: number }[]>();
    for (const slot of item.slots) {
      let arr = groups.get(slot.banker);
      if (!arr) { arr = []; groups.set(slot.banker, arr); }
      arr.push({ location: slot.location, quantity: slot.quantity });
    }
    return groups;
  }, [item.slots]);

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        className="w-full flex items-center gap-2 py-1.5 px-2 bg-transparent border-none cursor-pointer text-left hover:bg-surface-2 transition-colors duration-fast"
        onClick={() => setExpanded(!expanded)}
      >
        <span
          className="collapse-chevron text-text-dim text-caption shrink-0"
          data-expanded={expanded}
        >
          ›
        </span>
        <span className="text-text font-body text-caption font-semibold flex-1 min-w-0 truncate">
          {item.name}
        </span>
        <Badge variant="count" color="accent" className="shrink-0">
          {item.totalQuantity}x
        </Badge>
        <span className={text({ variant: 'caption' }) + ' shrink-0'}>
          {item.bankers.length} {item.bankers.length === 1 ? 'banker' : 'bankers'}
        </span>
      </button>
      <div className="collapse-container" data-expanded={expanded}>
        <div className="collapse-inner">
          <div className="px-2 pb-1.5 pt-0.5 ml-3 border-l border-border-subtle">
            {Array.from(bankerGroups.entries()).map(([banker, slots]) => (
              <div key={banker} className="py-0.5">
                <Link to={`/bank/${encodeURIComponent(banker)}`} className="no-underline text-text-secondary font-body text-caption font-semibold hover:text-accent transition-colors duration-fast">{banker}</Link>
                <div className="flex flex-col gap-px mt-0.5">
                  {slots.map((slot, i) => (
                    <div key={i} className="flex items-center gap-1.5 pl-1.5">
                      <span className={text({ variant: 'caption' })}>{slot.location}</span>
                      {slot.quantity > 1 && (
                        <Badge variant="count" color="dim">{slot.quantity}x</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BankPage() {
  const { user } = useAuth();
  const { data, isLoading, error } = useBankQuery();
  const importMutation = useBankImport();
  const { data: history, isLoading: historyLoading } = useBankHistory();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [bankerFilter, setBankerFilter] = useState<string | null>(null);
  const [collapsedPanels, setCollapsedPanels] = useState<Set<string>>(new Set(['inventory', 'activity-full']));
  // Track whether inventory was auto-opened (by filter or search) so we can auto-close it
  const [autoOpened, setAutoOpened] = useState(false);

  const togglePanel = useCallback((id: string) => {
    setCollapsedPanels(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    // If user manually toggles inventory, clear auto-opened tracking
    if (id === 'inventory') setAutoOpened(false);
  }, []);

  const handleBankerFilter = useCallback((banker: string | null) => {
    setBankerFilter(banker);
    if (banker) {
      // Auto-expand inventory when filtering
      setCollapsedPanels(prev => {
        if (!prev.has('inventory')) return prev;
        const next = new Set(prev);
        next.delete('inventory');
        return next;
      });
      setAutoOpened(true);
    } else if (autoOpened) {
      // Re-collapse inventory when clearing filter (if it was auto-opened)
      setCollapsedPanels(prev => {
        if (prev.has('inventory')) return prev;
        const next = new Set(prev);
        next.add('inventory');
        return next;
      });
      setAutoOpened(false);
    }
  }, [autoOpened]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
    // Auto-expand inventory when typing a search
    if (value && collapsedPanels.has('inventory')) {
      setCollapsedPanels(prev => {
        const next = new Set(prev);
        next.delete('inventory');
        return next;
      });
      setAutoOpened(true);
    }
  }, [collapsedPanels]);

  const filtered = useMemo(() => {
    if (!data) return [];
    let result = data;
    if (bankerFilter) {
      result = result.filter(item => item.bankers.includes(bankerFilter));
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(item => item.name.toLowerCase().includes(q));
    }
    return result;
  }, [data, search, bankerFilter]);

  const uniqueBankers = useMemo(() => {
    if (!data) return 0;
    const bankers = new Set<string>();
    for (const item of data) {
      for (const b of item.bankers) bankers.add(b);
    }
    return bankers.size;
  }, [data]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      importMutation.mutate({ filename: file.name, content: reader.result as string });
    };
    reader.readAsText(file);
    // Reset so the same file can be re-selected
    e.target.value = '';
  }, [importMutation]);

  const isOfficer = user?.isOfficer || user?.isAdmin || user?.isOwner;
  const hasActiveFilter = bankerFilter !== null || search !== '';

  return (
    <div className="flex flex-1 flex-col overflow-hidden grain-overlay">
      <AppHeader />
      <div className="flex-1 overflow-y-auto relative z-0">
        <div className="max-w-content mx-auto py-3 px-3 pb-8 w-full flex flex-col gap-2 max-md:px-1.5 max-md:py-1.5 max-md:pb-14">
          {error && <Text variant="error">{error instanceof Error ? error.message : 'Failed to fetch bank'}</Text>}
          {isLoading && <Text variant="caption" className="py-6 text-center block">Loading...</Text>}

          {importMutation.isSuccess && importMutation.data && (
            <Card className="border-green">
              <div className="px-2 py-1.5 flex flex-col gap-0.5">
                <Text variant="caption" className="text-green font-semibold">
                  Imported {importMutation.data.inserted} items for {importMutation.data.banker}
                </Text>
                <Text variant="caption">
                  {importMutation.data.diff.added > 0 && `+${importMutation.data.diff.added} added `}
                  {importMutation.data.diff.removed > 0 && `-${importMutation.data.diff.removed} removed `}
                  {importMutation.data.diff.changed > 0 && `${importMutation.data.diff.changed} changed`}
                  {importMutation.data.diff.added === 0 && importMutation.data.diff.removed === 0 && importMutation.data.diff.changed === 0 && 'No changes from previous import'}
                </Text>
              </div>
            </Card>
          )}

          {importMutation.isError && (
            <Card className="border-red">
              <div className="px-2 py-1.5">
                <Text variant="caption" className="text-red">
                  {importMutation.error instanceof Error ? importMutation.error.message : 'Import failed'}
                </Text>
              </div>
            </Card>
          )}

          {!isLoading && data && (
            <>
              {/* Treemap — banker distribution */}
              <BankerTreemap
                data={data}
                bankerFilter={bankerFilter}
                onBankerFilter={handleBankerFilter}
              />

              {/* Filter strip */}
              <div className="flex items-center gap-1 px-0.5 min-h-6 flex-wrap">
                <Text variant="secondary" as="span" className="text-caption">Showing:</Text>
                {!hasActiveFilter && (
                  <Badge variant="filter">All</Badge>
                )}
                {bankerFilter && (
                  <Badge variant="filter" className="inline-flex items-center gap-1">
                    <span>{bankerFilter}</span>
                    <button
                      className="bg-transparent border-none cursor-pointer text-text-dim hover:text-red ml-0.5 p-0 text-caption"
                      onClick={() => handleBankerFilter(null)}
                    >
                      &times;
                    </button>
                  </Badge>
                )}
                {search && (
                  <Badge variant="filter" className="inline-flex items-center gap-1">
                    <span>"{search}"</span>
                    <button
                      className="bg-transparent border-none cursor-pointer text-text-dim hover:text-red ml-0.5 p-0 text-caption"
                      onClick={() => setSearch('')}
                    >
                      &times;
                    </button>
                  </Badge>
                )}
                <span className={text({ variant: 'caption' }) + ' ml-auto max-md:ml-0'}>
                  {hasActiveFilter
                    ? `${filtered.length} of ${data.length} items`
                    : `${data.length} unique items across ${uniqueBankers} ${uniqueBankers === 1 ? 'banker' : 'bankers'}`
                  }
                </span>
                {isOfficer && (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".txt,.tsv"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Button
                      intent="primary"
                      size="sm"
                      pending={importMutation.isPending || undefined}
                      className="shrink-0"
                      disabled={importMutation.isPending}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {importMutation.isPending ? 'Importing...' : 'Import Inventory'}
                    </Button>
                  </>
                )}
              </div>

              {/* Activity — recent imports, open by default */}
              <CollapsibleCard
                id="activity"
                title="ACTIVITY"
                count={history?.length}
                collapsedPanels={collapsedPanels}
                onToggle={togglePanel}
              >
                <div className="border-t border-border">
                  {historyLoading && (
                    <Text variant="caption" className="text-center py-4 block">Loading...</Text>
                  )}
                  {!historyLoading && (!history || history.length === 0) && (
                    <Text variant="caption" className="text-center py-4 block">No transactions yet</Text>
                  )}
                  {history?.slice(0, 5).map(record => (
                    <BankHistoryEntry key={record.id} record={record} showBanker />
                  ))}
                  {history && history.length > 5 && collapsedPanels.has('activity-full') && (
                    <button
                      className="w-full py-1.5 px-2 bg-transparent border-none border-t border-border cursor-pointer text-text-dim text-caption hover:text-accent transition-colors duration-fast"
                      onClick={() => togglePanel('activity-full')}
                    >
                      Show all {history.length} entries
                    </button>
                  )}
                  {history && history.length > 5 && !collapsedPanels.has('activity-full') && (
                    <>
                      {history.slice(5).map(record => (
                        <BankHistoryEntry key={record.id} record={record} showBanker />
                      ))}
                    </>
                  )}
                </div>
              </CollapsibleCard>

              {/* Inventory — collapsed by default, auto-expands on search/filter */}
              <CollapsibleCard
                id="inventory"
                title={bankerFilter ? bankerFilter.toUpperCase() : 'INVENTORY'}
                count={filtered.length}
                collapsedPanels={collapsedPanels}
                onToggle={togglePanel}
              >
                <div className="border-t border-border">
                  <div className="flex items-center gap-1 py-1 px-2 border-b border-border">
                    <Input
                      variant="transparent"
                      size="sm"
                      type="text"
                      placeholder="Search items..."
                      value={search}
                      onChange={handleSearchChange}
                      className="w-full"
                    />
                  </div>
                  <div>
                    {filtered.map(item => (
                      <BankItemRow key={item.name} item={item} />
                    ))}
                    {filtered.length === 0 && (
                      <Text variant="caption" className="text-center py-4 block">
                        No items match your search
                      </Text>
                    )}
                  </div>
                </div>
              </CollapsibleCard>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
