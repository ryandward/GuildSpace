import { EQUIPMENT_SLOTS } from '../../lib/equipmentSlots';
import ItemIcon from '../bank/ItemIcon';
import ItemTooltip from '../bank/ItemTooltip';

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
  const itemMap = new Map(items.map(i => [i.slot, i]));

  return (
    <div className="equipment-grid">
      {EQUIPMENT_SLOTS.map(slot => {
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
  );
}
