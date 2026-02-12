import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * A chat message. Stored permanently.
 */
@Entity('chat_messages', { schema: 'public' })
export class ChatMessage {
  @PrimaryGeneratedColumn()
  id: number;

  /** Channel name (e.g. 'general', 'officers') */
  @Column('text', { name: 'channel' })
  channel: string;

  /** Sender's Discord ID */
  @Column('text', { name: 'user_id' })
  userId: string;

  /** Display name at time of sending */
  @Column('text', { name: 'display_name' })
  displayName: string;

  /** Message content */
  @Column('text', { name: 'content' })
  content: string;

  /** When it was sent */
  @Column('timestamp', { name: 'created_at', default: () => 'NOW()' })
  createdAt: Date;
}
