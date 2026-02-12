import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Raid attendance record (maps to `public.attendance`).
 *
 * Rows are created by the `/attendance` command when an officer pastes a
 * `/who` log. Each row links a character name to a specific raid event,
 * feeding into the DKP calculation pipeline.
 */
@Index('idx_17824_attendance_pkey', ['Id'], { unique: true })
@Entity('attendance', { schema: 'public' })
export class Attendance {
  /** Name of the raid event (foreign key concept to `Raids`). */
  @Column('text', { name: 'raid', nullable: true })
  Raid: string | null;

  /** Character name present at the raid. */
  @Column('text', { name: 'name', nullable: true })
  Name: string | null;

  /** Date/time of the attendance record. */
  @Column('timestamp without time zone', { name: 'date', nullable: true })
  Date: Date | null;

  /** Discord snowflake ID of the character's owner. */
  @Column('text', { name: 'discord_id', nullable: true })
  DiscordId: string | null;

  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  Id: string;

  /** DKP modifier applied for this attendance (from the `Raids` table). */
  @Column('bigint', { name: 'modifier', nullable: true })
  Modifier: string | null;
}
