import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Guild bank inventory record (maps to `public.bank`).
 *
 * Tracks items stored across guild banker characters.
 * Populated by the `/income` command and consumed by `/find` and `/browse`.
 */
@Index('idx_17812_bank_pkey', ['Id'], { unique: true })
@Entity('bank', { schema: 'public' })
export class Bank {
  /** Name of the banker character holding this item. */
  @Column('text', { name: 'banker' })
  Banker: string;

  /** Inventory slot location on the banker (e.g. bag position). */
  @Column('text', { name: 'location' })
  Location: string;

  /** Item name as it appears in-game. */
  @Column('text', { name: 'name' })
  Name: string;

  /** EverQuest item database ID, used for wiki lookups. */
  @Column('text', { name: 'eq_item_id' })
  EqItemId: string;

  /** Stack count for stackable items. */
  @Column('bigint', { name: 'quantity' })
  Quantity: number;

  /** Raw slot data from the inventory export. */
  @Column('bigint', { name: 'slots' })
  Slots: string;

  /** Timestamp when this bank record was imported. */
  @Column('timestamp without time zone', { name: 'time' })
  Time: Date;

  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  Id: string;
}
