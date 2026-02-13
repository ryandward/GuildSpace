ALTER TABLE guildspace_users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
UPDATE guildspace_users SET is_admin = true, is_officer = true WHERE discord_id = '816198379344232488';
