import { useState, useMemo } from 'react';
import { EQUIPMENT_SLOTS } from '../../lib/equipmentSlots';
import ItemIcon from '../bank/ItemIcon';
import ItemTooltip from '../bank/ItemTooltip';
import { Text } from '../../ui';

export interface EquipmentItem {
  slot: string;
  itemName: string;
  eqItemId: string;
  iconId: number | null;
  statsblock: string | null;
}

interface Props {
  items: EquipmentItem[];
}

const WORN_SLOTS = EQUIPMENT_SLOTS.filter(s => !s.key.startsWith('General'));
const BAG_SLOTS = EQUIPMENT_SLOTS.filter(s => s.key.startsWith('General'));
const MAX_BAG_SLOTS = 10;

export default function EquipmentGrid({ items }: Props) {
  const [expandedBag, setExpandedBag] = useState<string | null>(null);
  const itemMap = new Map(items.map(i => [i.slot, i]));

  // Group bag contents: "General1-Slot2" → parent "General1"
  // Keep all slots (including empty) to show the full bag layout
  const bagContents = useMemo(() => {
    const map = new Map<string, EquipmentItem[]>();
    for (const item of items) {
      const match = item.slot.match(/^(General\d+)-Slot\d+$/);
      if (match) {
        const parent = match[1];
        let arr = map.get(parent);
        if (!arr) { arr = []; map.set(parent, arr); }
        arr.push(item);
      }
    }
    return map;
  }, [items]);

  const hasBags = BAG_SLOTS.some(s => itemMap.has(s.key));

  return (
    <div className="flex flex-col gap-1">
      {/* Worn gear grid */}
      <div className="equipment-grid">
        {WORN_SLOTS.map(slot => {
          const item = itemMap.get(slot.key);
          const filled = item && item.itemName !== 'Empty';

          return (
            <div
              key={slot.key}
              className={`equipment-slot ${filled ? 'filled' : ''}`}
              style={{ '--slot-area': slot.gridArea } as React.CSSProperties}
            >
              <span className="equipment-slot-label">{slot.label}</span>
              {filled && (
                <ItemTooltip name={item.itemName} iconId={item.iconId} statsblock={item.statsblock}>
                  <ItemIcon iconId={item.iconId} size={40} />
                </ItemTooltip>
              )}
            </div>
          );
        })}
      </div>

      {/* Bags: 2-column grid + expanded contents side-by-side */}
      {hasBags && (
        <div className="flex gap-1 max-md:flex-col">
          <div className="bag-grid shrink-0">
            {BAG_SLOTS.map(slot => {
              const item = itemMap.get(slot.key);
              const filled = item && item.itemName !== 'Empty';
              const contents = bagContents.get(slot.key);
              const filledCount = contents?.filter(c => c.itemName !== 'Empty').length ?? 0;
              const totalSlots = contents?.length ?? 0;
              const isExpanded = expandedBag === slot.key;

              return (
                <div
                  key={slot.key}
                  className={`equipment-slot ${filled ? 'filled' : ''} ${isExpanded ? 'ring-1 ring-accent' : ''} ${filled ? 'cursor-pointer' : ''}`}
                  onClick={filled ? () => setExpandedBag(prev => prev === slot.key ? null : slot.key) : undefined}
                  role={filled ? 'button' : undefined}
                >
                  <span className="equipment-slot-label">{slot.label}</span>
                  {filled && (
                    <ItemTooltip name={item.itemName} iconId={item.iconId} statsblock={item.statsblock}>
                      <ItemIcon iconId={item.iconId} size={40} />
                    </ItemTooltip>
                  )}
                  {filled && totalSlots > 0 && (
                    <Text variant="caption" className="text-accent">{filledCount}/{totalSlots}</Text>
                  )}
                </div>
              );
            })}
          </div>

          {/* Expanded bag contents beside the bag grid */}
          {expandedBag && (() => {
            const contents = bagContents.get(expandedBag) ?? [];
            const bagItem = itemMap.get(expandedBag);
            const filledCount = contents.filter(c => c.itemName !== 'Empty').length;
            // Pad to full bag size (up to MAX_BAG_SLOTS)
            const slots: (EquipmentItem | null)[] = [];
            for (let i = 0; i < Math.max(contents.length, MAX_BAG_SLOTS); i++) {
              slots.push(contents[i] ?? null);
            }

            return (
              <div className="flex-1 min-w-0 bg-surface border border-border rounded-md overflow-hidden self-start">
                <div className="flex items-center gap-2 py-1 px-2 border-b border-border">
                  <Text variant="overline">
                    {bagItem?.itemName || expandedBag}
                  </Text>
                  <Text variant="caption" className="ml-auto">{filledCount}/{contents.length}</Text>
                </div>
                {slots.map((item, i) => {
                  const filled = item && item.itemName !== 'Empty';
                  return (
                    <div key={i} className={`flex items-center gap-2 py-1 px-2 border-b border-border-subtle last:border-b-0 ${filled ? 'hover:bg-surface-2' : ''} transition-colors duration-fast`}>
                      {filled ? (
                        <>
                          <ItemIcon iconId={item.iconId} />
                          <ItemTooltip name={item.itemName} iconId={item.iconId} statsblock={item.statsblock}>
                            <span className="text-text font-body text-caption font-semibold">{item.itemName}</span>
                          </ItemTooltip>
                        </>
                      ) : (
                        <Text variant="caption" className="text-text-dim">Empty</Text>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
