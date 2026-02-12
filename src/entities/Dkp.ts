import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Dragon Kill Points ledger (maps to `public.dkp`).
 *
 * Each row represents a guild member's cumulative DKP balance.
 * Points are earned via raid attendance and spent on loot bids.
 */
@Index('idx_17845_dkp_pkey', ['Id'], { unique: true })
@Entity('dkp', { schema: 'public' })
export class Dkp {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  Id: number;

  /** Discord display name at the time the record was created. */
  @Column('text', { name: 'discord_name', nullable: true })
  DiscordName: string;

  /** Total DKP earned from raid attendance. */
  @Column('bigint', { name: 'earned_dkp', nullable: true })
  EarnedDkp: number;

  /** Total DKP spent on loot claims. */
  @Column('bigint', { name: 'spent_dkp', nullable: true })
  SpentDkp: number;

  /** Discord snowflake ID linking this record to a Discord user. */
  @Column('text', { name: 'discord_id', nullable: true })
  DiscordId: string;

  /** Date the member originally joined the guild. */
  @Column('timestamp without time zone', {
    name: 'date_joined',
    nullable: true,
  })
  DateJoined: Date;
}
