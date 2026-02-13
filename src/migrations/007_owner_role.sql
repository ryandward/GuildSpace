ALTER TABLE guildspace_users ADD COLUMN IF NOT EXISTS is_owner BOOLEAN DEFAULT FALSE;
-- Single owner for now. TODO: multi-guild tenancy — each guild gets its own owner.
UPDATE guildspace_users SET is_owner = true, is_admin = true, is_officer = true WHERE discord_id = '816198379344232488';
