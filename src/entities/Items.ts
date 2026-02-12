import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Loot award history (maps to `public.items`).
 *
 * Records which player won an item and how much DKP they spent.
 * Used for auditing loot distribution and tracking DKP expenditure.
 */
@Index('idx_17851_items_pkey', ['Id'], { unique: true })
@Entity('items', { schema: 'public' })
export class Items {
  /** Character name of the player who received the item. */
  @Column('text', { name: 'name', nullable: true })
  Name: string | null;

  /** Date the item was awarded. */
  @Column('timestamp without time zone', { name: 'date', nullable: true })
  Date: Date | null;

  /** Name of the item that was awarded. */
  @Column('text', { name: 'item', nullable: true })
  Item: string | null;

  /** Amount of DKP spent to win this item. */
  @Column('bigint', { name: 'dkp_spent', nullable: true })
  DkpSpent: string | null;

  /** Discord snowflake ID of the player who received the item. */
  @Column('text', { name: 'discord_id', nullable: true })
  DiscordId: string | null;

  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  Id: string;
}
