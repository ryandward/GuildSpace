import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * EverQuest playable race reference table (maps to `public.races`).
 *
 * Lookup table of valid EQ race names, used for validation during
 * character registration.
 */
@Index('idx_17797_races_pkey', ['Id'], { unique: true })
@Entity('races', { schema: 'public' })
export class Races {
  /** Race name (e.g. `"Human"`, `"Dark Elf"`, `"Ogre"`). */
  @Column('text', { name: 'race', nullable: true })
  Race: string | null;

  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  Id: string;
}
