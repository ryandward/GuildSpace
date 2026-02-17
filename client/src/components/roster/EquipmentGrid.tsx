import { useState } from 'react';
import { EQUIPMENT_SLOTS } from '../../lib/equipmentSlots';

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
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null);
  const itemMap = new Map(items.map(i => [i.slot, i]));

  return (
    <div className="equipment-grid">
      {EQUIPMENT_SLOTS.map(slot => {
        const item = itemMap.get(slot.key);
        const filled = item && item.itemName !== 'Empty';
        const isHovered = hoveredSlot === slot.key;

        return (
          <div
            key={slot.key}
            className={`equipment-slot ${filled ? 'filled' : ''}`}
            style={{ '--slot-area': slot.gridArea } as React.CSSProperties}
            onMouseEnter={() => filled && setHoveredSlot(slot.key)}
            onMouseLeave={() => setHoveredSlot(null)}
          >
            <span className="equipment-slot-label">{slot.label}</span>
            <span className="equipment-slot-item">
              {filled ? item.itemName : '\u2014'}
            </span>
            {filled && isHovered && item.statsblock && (
              <div className="absolute z-tooltip left-0 bottom-full mb-1 p-1.5 bg-surface-3 border border-border rounded-sm shadow-lg max-w-64 whitespace-pre-wrap text-caption text-text-secondary font-mono leading-tight pointer-events-none">
                {item.statsblock}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
