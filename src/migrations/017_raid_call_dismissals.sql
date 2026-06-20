-- Records officer decisions to ignore an unrecognized /who name on a specific
-- call (e.g. a pug or other-guild player). One row per (call, name).
CREATE TABLE IF NOT EXISTS raid_call_dismissals (
  call_id       INTEGER NOT NULL REFERENCES raid_calls(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  reason        TEXT,
  dismissed_by  TEXT NOT NULL,
  dismissed_at  TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (call_id, name)
);
