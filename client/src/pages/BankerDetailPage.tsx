import { useState, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useBankQuery } from '../hooks/useBankQuery';
import { useBankerHistory } from '../hooks/useBankerHistory';
import { useBankSquash } from '../hooks/useBankSquash';
import { useBankerEquipment } from '../hooks/useBankerEquipment';
import BankHistoryEntry from '../components/BankHistoryEntry';
import EquipmentGrid from '../components/roster/EquipmentGrid';
import ItemIcon from '../components/bank/ItemIcon';
import ItemTooltip from '../components/bank/ItemTooltip';
import { Card, Input, Text, Badge, Heading } from '../ui';
import { text } from '../ui/recipes';

export default function BankerDetailPage() {
  const { banker } = useParams<{ banker: string }>();
  const { user } = useAuth();
  const { data, isLoading, error } = useBankQuery();
  const { data: history, isLoading: historyLoading } = useBankerHistory(banker);
  const squashMutation = useBankSquash();
  const { data: equipmentItems } = useBankerEquipment(banker);
  const [search, setSearch] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [showEquipment, setShowEquipment] = useState(false);

  const items = data?.items;

  const bankerItems = useMemo(() => {
    if (!items || !banker) return [];
    return items
      .filter(item => item.bankers.includes(banker))
      .map(item => {
        const slots = item.slots.filter(s => s.banker === banker);
        const qty = slots.reduce((sum, s) => sum + s.quantity, 0);
        return { name: item.name, quantity: qty, slots, iconId: item.iconId, statsblock: item.statsblock };
      });
  }, [items, banker]);

  const filtered = useMemo(() => {
    if (!search) return bankerItems;
    const q = search.toLowerCase();
    return bankerItems.filter(item => item.name.toLowerCase().includes(q));
  }, [bankerItems, search]);

  const filteredHistory = useMemo(() => {
    if (!history) return [];
    if (!historySearch) return history;
    const q = historySearch.toLowerCase();
    return history.filter(record => {
      const { added, removed, changed } = record.diff;
      return [...added, ...removed, ...changed].some(
        item => item.name.toLowerCase().includes(q)
      );
    });
  }, [history, historySearch]);

  // Every entry except the oldest (last in DESC list) is squashable
  const squashableIds = useMemo(() => {
    if (!history || history.length < 2) return new Set<string>();
    return new Set(history.slice(0, -1).map(r => r.id));
  }, [history]);

  const isOfficer = user?.isOfficer || user?.isAdmin || user?.isOwner;

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  }, []);

  return (
    <div className="flex-1 overflow-y-auto">
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

              {equipmentItems && equipmentItems.length > 0 && (
                <Card>
                  <button
                    className="w-full flex items-center gap-2 py-1.5 px-2 bg-transparent border-none cursor-pointer text-left hover:bg-surface-2 transition-colors duration-fast"
                    onClick={() => setShowEquipment(prev => !prev)}
                  >
                    <span
                      className="collapse-chevron text-text-dim text-caption shrink-0"
                      data-expanded={showEquipment}
                    >
                      ›
                    </span>
                    <span className={text({ variant: 'overline' })}>EQUIPPED GEAR</span>
                    <Text variant="caption" className="ml-auto">
                      {equipmentItems.filter(i => !i.slot.includes('-') && i.itemName !== 'Empty').length} slots
                    </Text>
                  </button>
                  <div className="collapse-container" data-expanded={showEquipment}>
                    <div className="collapse-inner">
                      <div className="p-2">
                        <EquipmentGrid items={equipmentItems} />
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              <div className="flex gap-2 max-md:flex-col">
                {/* Inventory */}
                <Card className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 py-1 px-2 border-b border-border">
                    <span className={text({ variant: 'overline' })}>INVENTORY</span>
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
                    {filtered.slice(0, 10).map(item => (
                      <div key={item.name} className="border-b border-border last:border-b-0 flex items-center gap-2 py-1.5 px-2">
                        <ItemIcon iconId={item.iconId} />
                        <ItemTooltip name={item.name} iconId={item.iconId} statsblock={item.statsblock}>
                          <span className="text-text font-body text-caption font-semibold">
                            {item.name}
                          </span>
                        </ItemTooltip>
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
                    {filtered.length > 10 && (
                      <Text variant="caption" className="text-center py-1.5 block">
                        Showing 10 of {filtered.length}
                      </Text>
                    )}
                  </div>
                </Card>

                {/* Activity */}
                <Card className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 py-1 px-2 border-b border-border">
                    <span className={text({ variant: 'overline' })}>ACTIVITY</span>
                  </div>
                  <div className="flex items-center gap-1 py-1 px-2 border-b border-border">
                    <Input
                      variant="transparent"
                      size="sm"
                      type="text"
                      placeholder="Search history..."
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <div>
                    {historyLoading && (
                      <Text variant="caption" className="text-center py-4 block">Loading...</Text>
                    )}
                    {!historyLoading && filteredHistory.length === 0 && (
                      <Text variant="caption" className="text-center py-4 block">
                        {!history || history.length === 0 ? 'No activity yet' : 'No matches'}
                      </Text>
                    )}
                    {filteredHistory.slice(0, 10).map(record => (
                      <BankHistoryEntry key={record.id} record={record} onSquash={isOfficer && squashableIds.has(record.id) ? (id) => squashMutation.mutate(id) : undefined} />
                    ))}
                    {filteredHistory.length > 10 && (
                      <Text variant="caption" className="text-center py-1.5 block">
                        Showing 10 of {filteredHistory.length}
                      </Text>
                    )}
                  </div>
                </Card>
              </div>
            </>
          )}
        </div>
      </div>
  );
}
