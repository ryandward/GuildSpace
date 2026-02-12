import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Mapping from EQ class to Discord role (maps to `public.class_roles`).
 *
 * Used to automatically assign Discord roles based on a character's class
 * when they are declared via `/main`, `/alt`, or `/bot`.
 */
@Index('idx_17857_class_roles_pkey', ['Id'], { unique: true })
@Entity('class_roles', { schema: 'public' })
export class ClassRoles {
  /** EverQuest class name (e.g. `"Warrior"`). */
  @Column('text', { name: 'character_class', nullable: true })
  CharacterClass: string | null;

  /** Discord role snowflake ID to assign for this class. */
  @Column('bigint', { name: 'role_id', nullable: true })
  RoleId: string | null;

  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  Id: string;
}
