import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * EverQuest class title definitions (maps to `public.class_definitions`).
 *
 * Maps character class + level thresholds to EQ class titles
 * (e.g. a level 51 Cleric becomes a "Templar"). Used by the `/ding`
 * command to announce title changes on level-up.
 */
@Index('idx_17834_class_definitions_pkey', ['Id'], { unique: true })
@Entity('class_definitions', { schema: 'public' })
export class ClassDefinitions {
  /** EQ class title name (e.g. `"Templar"`, `"Archmage"`). */
  @Column('text', { name: 'class_name' })
  ClassName: string;

  /** Base character class this title belongs to (e.g. `"Cleric"`). */
  @Column('text', { name: 'character_class' })
  CharacterClass: string;

  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  Id: string;

  /** Minimum level at which this class title is attained. */
  @Column('bigint', { name: 'level_attained' })
  LevelAttained: number;
}
