import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** A comment left on a raid event by any registered member. */
@Entity('raid_event_comments')
export class RaidEventComment {
  @PrimaryGeneratedColumn()
  id: number;

  /** The raid event this comment belongs to. Cascades on event delete. */
  @Column('int', { name: 'event_id' })
  eventId: number;

  /** Author's Discord ID. */
  @Column('text', { name: 'user_id' })
  userId: string;

  /** Author's display name at the time of writing. */
  @Column('text', { name: 'display_name' })
  displayName: string;

  @Column('text', { name: 'content' })
  content: string;

  @Column('timestamp', { name: 'created_at', default: () => 'NOW()' })
  createdAt: Date;
}
