import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('raid_calls', { schema: 'public' })
export class RaidCall {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  id: number;

  @Column('integer', { name: 'event_id' })
  eventId: number;

  @Column('text', { name: 'raid_name' })
  raidName: string;

  @Column('integer', { name: 'modifier' })
  modifier: number;

  @Column('text', { name: 'who_log', nullable: true })
  whoLog: string | null;

  @Column('text', { name: 'created_by' })
  createdBy: string;

  @Column('integer', { name: 'sort_order', nullable: true })
  sortOrder: number | null;

  @Column('timestamp', { name: 'created_at', default: () => 'NOW()' })
  createdAt: Date;
}
