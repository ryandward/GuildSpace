import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Platinum currency transaction ledger (maps to `public.plat`).
 *
 * Records individual plat deposits and withdrawals for guild banking.
 * Positive amounts are deposits; negative amounts are withdrawals.
 * Managed via the `/plat` command by officers.
 */
@Index('plat_pkey', ['Id'], { unique: true })
@Entity('plat', { schema: 'public' })
export class Plat {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  Id: number;

  /** Discord snowflake ID of the member involved in this transaction. */
  @Column('character varying', { name: 'discord_id', length: 255 })
  DiscordId: string;

  /** Transaction amount in platinum (positive = deposit, negative = withdrawal). */
  @Column('integer', { name: 'amount' })
  Amount: number;

  /** When the transaction occurred (defaults to current timestamp). */
  @Column('timestamp with time zone', {
    name: 'transaction_time',
    nullable: true,
    default: () => 'CURRENT_TIMESTAMP',
  })
  TransactionTime: Date | null;

  /** Human-readable description of the transaction purpose. */
  @Column('character varying', { name: 'description', nullable: true })
  Description: string | null;
}
