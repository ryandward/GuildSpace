-- Raid events: groups multiple DKP calls into a single raid night session
CREATE TABLE IF NOT EXISTS raid_events (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  created_by  TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'active',
  created_at  TIMESTAMP DEFAULT NOW(),
  closed_at   TIMESTAMP
);

-- Individual DKP calls within an event
CREATE TABLE IF NOT EXISTS raid_calls (
  id          SERIAL PRIMARY KEY,
  event_id    INTEGER NOT NULL REFERENCES raid_events(id) ON DELETE CASCADE,
  raid_name   TEXT NOT NULL,
  modifier    INTEGER NOT NULL,
  who_log     TEXT,
  created_by  TEXT NOT NULL,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- Links calls to the attendance rows they created (enables undo)
CREATE TABLE IF NOT EXISTS raid_call_attendance (
  call_id        INTEGER NOT NULL REFERENCES raid_calls(id) ON DELETE CASCADE,
  attendance_id  BIGINT NOT NULL REFERENCES attendance(id) ON DELETE CASCADE,
  PRIMARY KEY (call_id, attendance_id)
);

-- Officer flag for gating write operations
ALTER TABLE guildspace_users
  ADD COLUMN IF NOT EXISTS is_officer BOOLEAN DEFAULT FALSE;

-- API key for companion app authentication
ALTER TABLE guildspace_users
  ADD COLUMN IF NOT EXISTS api_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_guildspace_users_api_key
  ON guildspace_users (api_key) WHERE api_key IS NOT NULL;
