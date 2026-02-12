CREATE TABLE IF NOT EXISTS guildspace_users (
  discord_id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL UNIQUE,
  discord_username TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
