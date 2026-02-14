CREATE TABLE IF NOT EXISTS chat_channels (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  min_role TEXT NOT NULL DEFAULT 'member',
  created_by TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO chat_channels (name, display_name, min_role, created_by)
VALUES ('general', 'General', 'member', 'system')
ON CONFLICT (name) DO NOTHING;
