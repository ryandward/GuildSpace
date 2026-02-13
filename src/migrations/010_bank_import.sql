CREATE TABLE IF NOT EXISTS bank_import (
  id              BIGSERIAL PRIMARY KEY,
  banker          TEXT NOT NULL,
  uploaded_by     TEXT NOT NULL,
  uploaded_by_name TEXT NOT NULL,
  item_count      INTEGER NOT NULL DEFAULT 0,
  diff            JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_import_banker ON bank_import (banker);
