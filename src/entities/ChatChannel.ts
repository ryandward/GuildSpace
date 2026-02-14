import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('chat_channels', { schema: 'public' })
export class ChatChannel {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  /** Unique slug used as room name and URL param */
  @Column('text', { unique: true })
  name: string;

  /** Human-readable channel name */
  @Column('text', { name: 'display_name' })
  displayName: string;

  /** Minimum role required to access: member | officer | admin | owner */
  @Column('text', { name: 'min_role', default: 'member' })
  minRole: string;

  /** Discord ID of the user who created this channel */
  @Column('text', { name: 'created_by' })
  createdBy: string;

  @Column('timestamp', { name: 'created_at', default: () => 'NOW()' })
  createdAt: Date;
}
