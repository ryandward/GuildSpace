import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * EverQuest class lore text (maps to `public.class_lore`).
 *
 * Stores flavour descriptions for each EQ character class, displayed
 * by informational commands to help players understand class roles.
 */
@Index('idx_17829_class_lore_pkey', ['Id'], { unique: true })
@Entity('class_lore', { schema: 'public' })
export class ClassLore {
  /** EverQuest class name (e.g. `"Cleric"`, `"Shadow Knight"`). */
  @Column('text', { name: 'character_class', nullable: true })
  CharacterClass: string | null;

  /** Lore/flavour description for the class. */
  @Column('text', { name: 'description', nullable: true })
  Description: string | null;

  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  Id: string;
}
