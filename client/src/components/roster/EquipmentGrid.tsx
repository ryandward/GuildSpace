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

export default function EquipmentGrid({ items }: Props) {
  const [expandedBag, setExpandedBag] = useState<string | null>(null);
  const itemMap = new Map(items.map(i => [i.slot, i]));

  // Group bag contents: "General1-Slot2" → parent "General1"
  const bagContents = useMemo(() => {
    const map = new Map<string, EquipmentItem[]>();
    for (const item of items) {
      const match = item.slot.match(/^(General\d+)-Slot\d+$/);
      if (match) {
        const parent = match[1];
        let arr = map.get(parent);
        if (!arr) { arr = []; map.set(parent, arr); }
        if (item.itemName !== 'Empty') arr.push(item);
      }
    }
    return map;
  }, [items]);

  return (
    <div className="flex flex-col gap-1">
      <div className="equipment-grid">
        {EQUIPMENT_SLOTS.map(slot => {
          const item = itemMap.get(slot.key);
          const filled = item && item.itemName !== 'Empty';
          const isBag = slot.key.startsWith('General');
          const contents = isBag ? bagContents.get(slot.key) : undefined;
          const hasContents = contents && contents.length > 0;
          const isExpanded = expandedBag === slot.key;

          return (
            <div
              key={slot.key}
              className={`equipment-slot ${filled ? 'filled' : ''} ${isExpanded ? 'ring-1 ring-accent' : ''} ${isBag && hasContents ? 'cursor-pointer' : ''}`}
              style={{ '--slot-area': slot.gridArea } as React.CSSProperties}
              onClick={isBag && hasContents ? () => setExpandedBag(prev => prev === slot.key ? null : slot.key) : undefined}
              role={isBag && hasContents ? 'button' : undefined}
            >
              <span className="equipment-slot-label">{slot.label}</span>
              {filled && (
                <ItemTooltip name={item.itemName} iconId={item.iconId} statsblock={item.statsblock}>
                  <ItemIcon iconId={item.iconId} size={40} />
                </ItemTooltip>
              )}
              {isBag && hasContents && (
                <Text variant="caption" className="text-accent">{contents.length}</Text>
              )}
            </div>
          );
        })}
      </div>

      {/* Expanded bag contents */}
      {expandedBag && bagContents.get(expandedBag) && (
        <div className="bg-surface border border-border rounded-md overflow-hidden">
          <div className="flex items-center gap-2 py-1 px-2 border-b border-border">
            <Text variant="overline">
              {itemMap.get(expandedBag)?.itemName || expandedBag}
            </Text>
            <Text variant="caption" className="ml-auto">{bagContents.get(expandedBag)!.length} items</Text>
          </div>
          {bagContents.get(expandedBag)!.map((item, i) => (
            <div key={i} className="flex items-center gap-2 py-1 px-2 border-b border-border-subtle last:border-b-0 hover:bg-surface-2 transition-colors duration-fast">
              <ItemIcon iconId={item.iconId} />
              <ItemTooltip name={item.itemName} iconId={item.iconId} statsblock={item.statsblock}>
                <span className="text-text font-body text-caption font-semibold">{item.itemName}</span>
              </ItemTooltip>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
