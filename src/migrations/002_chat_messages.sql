CREATE TABLE IF NOT EXISTS chat_messages (
  id SERIAL PRIMARY KEY,
  channel TEXT NOT NULL DEFAULT 'general',
  user_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_channel_created ON chat_messages (channel, created_at DESC);
