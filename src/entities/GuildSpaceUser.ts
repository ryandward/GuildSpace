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

  /** Whether this user can perform officer actions */
  @Column('boolean', { name: 'is_officer', default: false })
  isOfficer: boolean;

  /** Whether this user is an admin (can manage officer roles) */
  @Column('boolean', { name: 'is_admin', default: false })
  isAdmin: boolean;

  /** Whether this user is the guild owner (immutable top-tier role) */
  @Column('boolean', { name: 'is_owner', default: false })
  isOwner: boolean;

  /** When the officer role was granted */
  @Column('timestamp', { name: 'officer_since', nullable: true })
  officerSince: Date | null;

  /** When the admin role was granted */
  @Column('timestamp', { name: 'admin_since', nullable: true })
  adminSince: Date | null;

  /** Personal API key for companion app auth */
  @Column('text', { name: 'api_key', nullable: true })
  apiKey: string | null;

  /** When they joined GuildSpace */
  @Column('timestamp', { name: 'created_at', default: () => 'NOW()' })
  createdAt: Date;

  /** True if this user has officer-level access or above */
  get hasOfficerAccess(): boolean {
    return this.isOfficer || this.isAdmin || this.isOwner;
  }

  /** True if this user has admin-level access or above */
  get hasAdminAccess(): boolean {
    return this.isAdmin || this.isOwner;
  }
}
