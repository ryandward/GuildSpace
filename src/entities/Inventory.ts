import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Character inventory snapshot (maps to `public.inventory`).
 *
 * Stores per-character inventory data imported from EQ output files.
 * Separate from `Bank` which tracks guild banker inventories.
 */
@Index('idx_17839_inventory_pkey', ['Id'], { unique: true })
@Entity('inventory', { schema: 'public' })
export class Inventory {
  /** Character name who owns this inventory slot. */
  @Column('text', { name: 'toon', nullable: true })
  Toon: string | null;

  /** Inventory slot location (bag, bank slot, etc.). */
  @Column('text', { name: 'location', nullable: true })
  Location: string | null;

  /** Item name. */
  @Column('text', { name: 'name', nullable: true })
  Name: string | null;

  /** EverQuest item database ID. */
  @Column('text', { name: 'eq_item_id', nullable: true })
  EqItemId: string | null;

  /** Stack count for stackable items. */
  @Column('bigint', { name: 'quantity', nullable: true })
  Quantity: string | null;

  /** Raw slot data. */
  @Column('bigint', { name: 'slots', nullable: true })
  Slots: string | null;

  /** Timestamp of the inventory import. */
  @Column('timestamp without time zone', { name: 'time', nullable: true })
  Time: Date | null;

  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  Id: string;
}
