import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('raid_call_dismissals', { schema: 'public' })
export class RaidCallDismissal {
  @PrimaryColumn('integer', { name: 'call_id' })
  callId: number;

  @PrimaryColumn('text', { name: 'name' })
  name: string;

  @Column('text', { name: 'reason', nullable: true })
  reason: string | null;

  @Column('text', { name: 'dismissed_by' })
  dismissedBy: string;

  @Column('timestamp', { name: 'dismissed_at', default: () => 'NOW()' })
  dismissedAt: Date;
}
