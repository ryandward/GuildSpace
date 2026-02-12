import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Core guild-member character record (maps to `public.census`).
 *
 * Every registered character — main, alt, or bot — gets a row here.
 * `Status` distinguishes active members from dropped ones;
 * the `ActiveToons` view filters to non-dropped records.
 */
@Index('idx_17818_census_pkey', ['Id'], { unique: true })
@Entity('census', { schema: 'public' })
export class Census {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  Id: number;

  /** Discord snowflake ID of the player who owns this character. */
  @Column('text', { name: 'discord_id' })
  DiscordId: string;

  /** In-game character name (unique within active records). */
  @Column('text', { name: 'name' })
  Name: string;

  /** EverQuest class name, e.g. `"Cleric"`, `"Wizard"`. */
  @Column('text', { name: 'character_class' })
  CharacterClass: string;

  /** Current character level (1–60). */
  @Column('bigint', { name: 'level' })
  Level: number;

  /** Membership status — `"Main"`, `"Alt"`, `"Bot"`, `"Dropped"`, or `"Probationary"`. */
  @Column('text', { name: 'status' })
  Status: string;

  /** Timestamp when this record was created or last updated. */
  @Column('text', { name: 'time' })
  Time: Date;
}
