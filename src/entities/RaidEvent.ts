import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('raid_events', { schema: 'public' })
export class RaidEvent {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  id: number;

  @Column('text', { name: 'name' })
  name: string;

  @Column('text', { name: 'created_by' })
  createdBy: string;

  @Column('text', { name: 'status', default: 'active' })
  status: string;

  @Column('timestamp', { name: 'created_at', default: () => 'NOW()' })
  createdAt: Date;

  @Column('timestamp', { name: 'closed_at', nullable: true })
  closedAt: Date | null;
}
