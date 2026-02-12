import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Self-assignable Discord roles (maps to `public.self_roles`).
 *
 * Officers register roles here via `/create_role`; members can then
 * assign/remove these roles on themselves using the `/roles` command.
 */
@Index('idx_self_roles_pkey', ['Id'], { unique: true })
@Entity('self_roles', { schema: 'public' })
export class SelfRoles {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  Id: string;

  /** Discord role snowflake ID. */
  @Column('bigint', { name: 'role_id', unique: true })
  RoleId: string;

  /** Human-readable role name shown in the selection menu. */
  @Column('text', { name: 'role_name' })
  RoleName: string;

  /** Description displayed when browsing available self-roles. */
  @Column('text', { name: 'description', nullable: true })
  Description: string | null;
}
