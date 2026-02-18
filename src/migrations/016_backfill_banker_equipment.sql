-- Backfill character_equipment from existing bank data for banker worn gear + bags.
-- Bankers are mules (not in active_toons), so use 'banker' as sentinel discord_id.
-- Idempotent: ON CONFLICT updates existing rows. Re-runs safely on every startup.

WITH normalized AS (
  SELECT
    b.id,
    b.banker,
    b.name AS item_name,
    b.eq_item_id,
    CASE b.location
      WHEN 'Fingers' THEN 'Finger'
      WHEN 'Ears' THEN 'Ear'
      WHEN 'Wrists' THEN 'Wrist'
      ELSE b.location
    END AS norm_loc
  FROM bank b
),
slotted AS (
  SELECT
    banker,
    item_name,
    eq_item_id,
    norm_loc,
    CASE
      WHEN norm_loc IN ('Ear','Wrist','Finger')
        THEN norm_loc || ROW_NUMBER() OVER (PARTITION BY banker, norm_loc ORDER BY id)
      ELSE norm_loc
    END AS slot,
    CASE
      WHEN norm_loc IN ('Ear','Wrist','Finger')
        THEN ROW_NUMBER() OVER (PARTITION BY banker, norm_loc ORDER BY id)
      ELSE 1
    END AS rn
  FROM normalized
  WHERE norm_loc IN (
    'Ear','Head','Face','Neck','Shoulders','Arms','Back',
    'Wrist','Range','Hands','Primary','Secondary',
    'Finger','Chest','Legs','Feet','Waist','Ammo',
    'General1','General2','General3','General4',
    'General5','General6','General7','General8'
  )
  OR norm_loc ~ '^General\d+-Slot\d+$'
)
INSERT INTO character_equipment (character_name, discord_id, slot, item_name, eq_item_id, updated_at)
SELECT banker, 'banker', slot, item_name, eq_item_id, NOW()
FROM slotted
WHERE rn <= 2
ON CONFLICT (character_name, slot) DO UPDATE SET
  item_name = EXCLUDED.item_name,
  eq_item_id = EXCLUDED.eq_item_id,
  updated_at = EXCLUDED.updated_at;
