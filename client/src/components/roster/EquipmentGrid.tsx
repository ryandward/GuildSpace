import { useState, useMemo } from 'react';
import { WORN_SLOTS, INVENTORY_BAG_SLOTS, BANK_BAG_SLOTS } from '../../lib/equipmentSlots';
import type { SlotDef } from '../../lib/equipmentSlots';
import ItemIcon from '../bank/ItemIcon';
import ItemTooltip from '../bank/ItemTooltip';
import { Text } from '../../ui';
import { text } from '../../ui/recipes';

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

const MAX_BAG_SLOTS = 10;

export default function EquipmentGrid({ items }: Props) {
  const [expandedBag, setExpandedBag] = useState<string | null>(null);
  const itemMap = new Map(items.map(i => [i.slot, i]));

  // Group bag contents: "General1-Slot2" or "Bank3-Slot5" → parent key
  const bagContents = useMemo(() => {
    const map = new Map<string, EquipmentItem[]>();
    for (const item of items) {
      const match = item.slot.match(/^((?:General|Bank)\d+)-Slot\d+$/);
      if (match) {
        const parent = match[1];
        let arr = map.get(parent);
        if (!arr) { arr = []; map.set(parent, arr); }
        arr.push(item);
      }
    }
    return map;
  }, [items]);

  const hasInventoryBags = INVENTORY_BAG_SLOTS.some(s => itemMap.has(s.key));
  const hasBankBags = BANK_BAG_SLOTS.some(s => itemMap.has(s.key));

  function renderBagRow(label: string, slots: SlotDef[]) {
    return (
      <div className="flex flex-col gap-0.5">
        <span className={text({ variant: 'overline' })}>{label}</span>
        <div className="bag-row">
          {slots.map(slot => {
            const item = itemMap.get(slot.key);
            const filled = item && item.itemName !== 'Empty';
            const isBag = bagContents.has(slot.key);
            const contents = bagContents.get(slot.key);
            const filledCount = contents?.filter(c => c.itemName !== 'Empty').length ?? 0;
            const totalSlots = contents?.length ?? 0;
            const isExpanded = expandedBag === slot.key;

            return (
              <div
                key={slot.key}
                className={`equipment-slot ${filled ? 'filled' : ''} ${isExpanded ? 'ring-1 ring-accent' : ''} ${isBag ? 'cursor-pointer' : ''}`}
                onClick={isBag ? () => setExpandedBag(prev => prev === slot.key ? null : slot.key) : undefined}
                role={isBag ? 'button' : undefined}
              >
                <span className="equipment-slot-label">{slot.label}</span>
                {filled && (
                  <ItemTooltip name={item.itemName} iconId={item.iconId} statsblock={item.statsblock}>
                    <ItemIcon iconId={item.iconId} size={40} />
                  </ItemTooltip>
                )}
                {isBag && (
                  <Text variant="caption" className="text-accent">{filledCount}/{totalSlots}</Text>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

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

      {/* Bag rows */}
      {hasInventoryBags && renderBagRow('INVENTORY', INVENTORY_BAG_SLOTS)}
      {hasBankBags && renderBagRow('BANK', BANK_BAG_SLOTS)}

      {/* Expanded bag contents below */}
      {expandedBag && bagContents.get(expandedBag) && (() => {
        const contents = bagContents.get(expandedBag)!;
        const slots: (EquipmentItem | null)[] = [];
        for (let i = 0; i < Math.max(contents.length, MAX_BAG_SLOTS); i++) {
          slots.push(contents[i] ?? null);
        }

        return (
          <div className="bg-surface border border-border rounded-md overflow-hidden">
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
  );
}
