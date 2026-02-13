ALTER TABLE guildspace_users ADD COLUMN IF NOT EXISTS officer_since TIMESTAMP;
ALTER TABLE guildspace_users ADD COLUMN IF NOT EXISTS admin_since TIMESTAMP;

-- Backfill existing role holders
UPDATE guildspace_users SET officer_since = NOW() WHERE is_officer = true AND officer_since IS NULL;
UPDATE guildspace_users SET admin_since = NOW() WHERE is_admin = true AND admin_since IS NULL;
