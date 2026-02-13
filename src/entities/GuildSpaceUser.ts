import { Column, Entity, PrimaryColumn, CreateDateColumn } from 'typeorm';

/**
 * GuildSpace user account. Links a Discord ID to a chosen GuildSpace name.
 */
@Entity('guildspace_users', { schema: 'public' })
export class GuildSpaceUser {
  /** Discord snowflake ID */
  @PrimaryColumn('text', { name: 'discord_id' })
  discordId: string;

  /** User-chosen GuildSpace display name */
  @Column('text', { name: 'display_name' })
  displayName: string;

  /** Discord username (for reference) */
  @Column('text', { name: 'discord_username' })
  discordUsername: string;

  /** Free-text bio / about me */
  @Column('text', { name: 'bio', nullable: true })
  bio: string | null;

  /** When they joined GuildSpace */
  @Column('timestamp', { name: 'created_at', default: () => 'NOW()' })
  createdAt: Date;
}
