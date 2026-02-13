import { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useBankQuery, type BankItem } from '../hooks/useBankQuery';
import AppHeader from '../components/AppHeader';
import { Card, Input, Text, Badge } from '../ui';
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
  const { data, isLoading, error } = useBankQuery();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!data) return [];
    if (!search) return data;
    const q = search.toLowerCase();
    return data.filter(item => item.name.toLowerCase().includes(q));
  }, [data, search]);

  const uniqueBankers = useMemo(() => {
    if (!data) return 0;
    const bankers = new Set<string>();
    for (const item of data) {
      for (const b of item.bankers) bankers.add(b);
    }
    return bankers.size;
  }, [data]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  }, []);

  return (
    <div className="flex flex-1 flex-col overflow-hidden grain-overlay">
      <AppHeader />
      <div className="flex-1 overflow-y-auto relative z-0">
        <div className="max-w-content mx-auto py-3 px-3 pb-8 w-full flex flex-col gap-2 max-md:px-1.5 max-md:py-1.5 max-md:pb-14">
          {error && <Text variant="error">{error instanceof Error ? error.message : 'Failed to fetch bank'}</Text>}
          {isLoading && <Text variant="caption" className="py-6 text-center block">Loading...</Text>}

          {!isLoading && data && (
            <>
              <Card>
                <div className="flex items-center gap-2 py-1 px-2 border-b border-border max-md:flex-wrap">
                  <span className={text({ variant: 'overline' })}>BANK</span>
                  <span className="text-text font-body text-body font-bold">
                    {search ? filtered.length : data.length}
                  </span>
                  {!search && (
                    <span className={text({ variant: 'caption' }) + ' ml-auto max-md:ml-0'}>
                      {data.length} unique items across {uniqueBankers} {uniqueBankers === 1 ? 'banker' : 'bankers'}
                    </span>
                  )}
                  {search && (
                    <span className={text({ variant: 'caption' }) + ' ml-auto max-md:ml-0'}>
                      {filtered.length} of {data.length} items
                    </span>
                  )}
                </div>
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
                    <BankItemRow key={item.name} item={item} />
                  ))}
                  {filtered.length === 0 && (
                    <Text variant="caption" className="text-center py-4 block">
                      No items match your search
                    </Text>
                  )}
                </div>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
