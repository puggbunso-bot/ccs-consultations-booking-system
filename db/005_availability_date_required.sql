-- =====================================================================
-- 005 — AVAILABILITY.DATE IS MANDATORY
--
--   No more "recurring" weekday rows. Every schedule entry is one
--   EXACT date that the faculty picked. If a faculty member has not
--   set a schedule, they simply have no rows — students see nothing.
-- =====================================================================

-- Backfill any leftover weekday-only rows to their next occurrence.
UPDATE availability a
   SET date = (
     SELECT d::date
       FROM generate_series(CURRENT_DATE, CURRENT_DATE + 6, interval '1 day') AS d
      WHERE EXTRACT(ISODOW FROM d::date) = CASE a.day
              WHEN 'Monday'    THEN 1 WHEN 'Tuesday'   THEN 2
              WHEN 'Wednesday' THEN 3 WHEN 'Thursday'  THEN 4
              WHEN 'Friday'    THEN 5 WHEN 'Saturday'  THEN 6
              ELSE 7
            END
      LIMIT 1
   )
 WHERE a.date IS NULL;

-- Every row must now carry an exact date.
ALTER TABLE availability ALTER COLUMN date SET NOT NULL;

COMMENT ON COLUMN availability.date IS
  'Exact consultation date — mandatory. Students can only book this date.';

-- The weekday must always agree with the date.
ALTER TABLE availability
  DROP CONSTRAINT IF EXISTS availability_date_matches_day;

ALTER TABLE availability
  ADD CONSTRAINT availability_date_matches_day
  CHECK (EXTRACT(ISODOW FROM date) =
         CASE day
           WHEN 'Monday'    THEN 1 WHEN 'Tuesday'   THEN 2
           WHEN 'Wednesday' THEN 3 WHEN 'Thursday'  THEN 4
           WHEN 'Friday'    THEN 5 WHEN 'Saturday'  THEN 6
           ELSE 7
         END);

CREATE INDEX IF NOT EXISTS idx_availability_date ON availability (date);

SELECT count(*) AS rows, count(date) AS dated FROM availability;
