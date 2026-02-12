import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Trash item filter list (maps to `public.trash`).
 *
 * Items on this list are excluded from bank import processing,
 * preventing common junk items from cluttering the guild bank records.
 */
@Index('idx_17802_trash_pkey', ['Id'], { unique: true })
@Entity('trash', { schema: 'public' })
export class Trash {
  /** Item name to filter out during bank imports. */
  @Column('text', { name: 'name', nullable: true })
  Name: string | null;

  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  Id: string;
}
