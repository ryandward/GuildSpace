-- Comments on a raid event. Open to any registered member, unlike the rest of
-- the raid endpoints, which are officer-only: the point is for people to say
-- "I was on Gigabroms for calls 2-3" the morning after.
CREATE TABLE IF NOT EXISTS raid_event_comments (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES raid_events(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  -- Snapshot of the author's name at write time, as chat_messages and
  -- bank_import both do. Display names change and there is no join helper.
  display_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_raid_event_comments_event
  ON raid_event_comments (event_id, created_at ASC);
