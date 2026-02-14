ALTER TABLE raid_calls ADD COLUMN IF NOT EXISTS sort_order INTEGER;

-- Backfill only rows that have no sort_order yet (preserves user-set reordering)
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY event_id ORDER BY created_at ASC) AS rn
  FROM raid_calls
  WHERE sort_order IS NULL
)
UPDATE raid_calls SET sort_order = numbered.rn FROM numbered WHERE raid_calls.id = numbered.id;
