ALTER TABLE raid_calls ADD COLUMN IF NOT EXISTS sort_order INTEGER;

-- Backfill existing rows: assign sort_order based on created_at ordering within each event
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY event_id ORDER BY created_at ASC) AS rn
  FROM raid_calls
)
UPDATE raid_calls SET sort_order = numbered.rn FROM numbered WHERE raid_calls.id = numbered.id;
