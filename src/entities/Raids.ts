import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * Raid event definitions (maps to `public.raids`).
 *
 * Each row defines a named raid target and its associated DKP modifier.
 * Referenced by the `/attendance` command when officers record who
 * attended a specific raid.
 */
@Entity('raids', { schema: 'public' })
export class Raids {
  /** Unique raid name, e.g. `"Nagafen"`, `"Vox"`. Also serves as the primary key. */
  @PrimaryColumn('text', { name: 'raid' })
  Raid: string;

  /** Raid category — e.g. `"Open World"`, `"Instanced"`. */
  @Column('text', { name: 'type', nullable: true })
  Type: string | null;

  /** DKP multiplier/modifier awarded for attending this raid. */
  @Column('bigint', { name: 'modifier', nullable: true })
  Modifier: number | null;

  @Column('bigint', { name: 'id', nullable: true })
  Id: number | null;
}
