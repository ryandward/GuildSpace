-- Repairs attendance rows that were stamped with the moment an officer made a
-- correction rather than the moment the raid happened.
--
-- creditCharacterToCall (the manual "add character" and assign-from-unrecognized
-- paths) set attendance.date = new Date(). An officer tidying up a raid the next
-- morning therefore wrote a row dated the next morning. Because the roster reads
-- that column only as MAX(date), such a row is newer than the real ones and
-- becomes the character's displayed last raid. The write path is fixed; this
-- repairs the rows it already made.
--
-- Identifying them is exact rather than heuristic: EverQuest log stamps carry
-- whole seconds, while new Date() carries milliseconds. A sub-second component
-- means the value cannot have come from a /who log.
--
-- Idempotent: after this runs the repaired rows hold whole-second values, so
-- the WHERE no longer matches them. A call whose rows are *all* machine-stamped
-- contributes no instant and is left untouched rather than guessed at.
WITH call_instant AS (
  SELECT rca.call_id, MIN(a.date) AS instant
  FROM raid_call_attendance rca
  JOIN attendance a ON a.id = rca.attendance_id
  WHERE a.date IS NOT NULL
    AND EXTRACT(milliseconds FROM a.date)::int % 1000 = 0
  GROUP BY rca.call_id
)
UPDATE attendance a
SET date = ci.instant
FROM raid_call_attendance rca, call_instant ci
WHERE a.id = rca.attendance_id
  AND ci.call_id = rca.call_id
  AND a.date IS NOT NULL
  AND EXTRACT(milliseconds FROM a.date)::int % 1000 <> 0;
