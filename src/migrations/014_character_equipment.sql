CREATE TABLE IF NOT EXISTS character_equipment (
  id              BIGSERIAL PRIMARY KEY,
  character_name  TEXT NOT NULL,
  discord_id      TEXT NOT NULL,
  slot            TEXT NOT NULL,
  item_name       TEXT NOT NULL DEFAULT 'Empty',
  eq_item_id      TEXT NOT NULL DEFAULT '0',
  updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_character_equipment_char_slot
  ON character_equipment (character_name, slot);
