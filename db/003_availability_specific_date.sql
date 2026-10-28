-- =====================================================================
-- 003 — AVAILABILITY: EXACT DATE
--
--   A consultation slot is now a SPECIFIC DATE, not just a weekday.
--   The faculty picks e.g. Oct 29, 2026 — students can only book that
--   exact date. `day` stays as a derived convenience (used for sorting
--   and for rows created before this migration).
--
--   date IS NULL  ->  legacy recurring-weekday row (pre-003 behaviour)
--   date IS SET   ->  one exact date, bookable only on that date
-- =====================================================================

ALTER TABLE availability ADD COLUMN IF NOT EXISTS date DATE;

COMMENT ON COLUMN availability.date IS
  'Exact consultation date. NULL = legacy recurring weekday row.';

-- The slot must still be inside the same day (guard against clock weirdness).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'availability_date_matches_day'
  ) THEN
    ALTER TABLE availability
      ADD CONSTRAINT availability_date_matches_day
      CHECK (date IS NULL OR EXTRACT(ISODOW FROM date) =
             CASE day
               WHEN 'Monday' THEN 1 WHEN 'Tuesday' THEN 2 WHEN 'Wednesday' THEN 3
               WHEN 'Thursday' THEN 4 WHEN 'Friday' THEN 5 WHEN 'Saturday' THEN 6
               ELSE 7
             END);
  END IF;
END $$;

-- Chronological lookups for the student views.
CREATE INDEX IF NOT EXISTS idx_availability_date ON availability (date);
