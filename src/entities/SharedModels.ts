import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Shared guild account (maps to `public.shared_accounts`).
 *
 * Represents an EverQuest account that is shared among guild members
 * (e.g. a guild-owned trader or buff bot). Each account can own
 * multiple {@link SharedToons}.
 */
@Index('shared_accounts_account_key', ['Account'], { unique: true })
@Index('shared_accounts_pkey', ['Id'], { unique: true })
@Entity('shared_accounts', { schema: 'public' })
export class SharedAccounts {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  Id: number;

  /** Unique account identifier / login name. */
  @Column('character varying', { name: 'account', unique: true, length: 255 })
  Account: string;

  /** Account password (stored in plaintext — shared guild accounts only). */
  @Column('character varying', { name: 'password', length: 255 })
  Password: string;

  /** Access role governing who may use this account (e.g. `"Officer"`, `"Member"`). */
  @Column('character varying', { name: 'role', length: 50 })
  Role: string;

  /** Characters that belong to this shared account. */
  @OneToMany(() => SharedToons, toon => toon.Account)
  SharedToons: SharedToons[];
}

/**
 * Character on a shared guild account (maps to `public.shared_toons`).
 *
 * Linked to a {@link SharedAccounts} record via a foreign key on the
 * `account` column. Officers manage these through `/login`, `/add`,
 * `/remove`, and `/delete_shared_toon` commands.
 */
@Index('shared_toons_pkey', ['Id'], { unique: true })
@Index('shared_toons_name_key', ['Name'], { unique: true })
@Entity('shared_toons', { schema: 'public' })
export class SharedToons {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  Id: number;

  /** Unique in-game character name. */
  @Column('character varying', { name: 'name', unique: true, length: 255 })
  Name: string;

  /** Free-text notes about this character (class, purpose, gear status, etc.). */
  @Column('text', { name: 'notes', nullable: true })
  Notes: string | null;

  /** The {@link SharedAccounts} this character belongs to. */
  @ManyToOne(() => SharedAccounts, accounts => accounts.SharedToons)
  @JoinColumn([{ name: 'account', referencedColumnName: 'Account' }])
  Account: SharedAccounts;
}
