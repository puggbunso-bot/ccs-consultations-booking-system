-- Registration approval workflow: allow status = 'pending'
-- New self-registered accounts stay pending until an admin approves them.

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;
ALTER TABLE users ADD CONSTRAINT users_status_check
    CHECK (status IN ('active', 'inactive', 'pending'));
