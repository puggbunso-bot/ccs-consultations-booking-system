-- =====================================================================
-- CCS FACULTY CONSULTATION SCHEDULING SYSTEM — Supabase (PostgreSQL)
-- Purpose: Faculty set available days/times. Students view them.
-- Tables : users, availability, sessions
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. USERS  (admin + faculty + student accounts)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email           TEXT NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    role            TEXT NOT NULL CHECK (role IN ('admin','faculty','student')),
    first_name      TEXT NOT NULL,
    last_name       TEXT NOT NULL,
    specialization  TEXT,                       -- faculty only (e.g. "AI")
    room            TEXT,                       -- faculty default room
    status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','inactive','pending')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 2. AVAILABILITY  ⭐ THE CORE TABLE
--    One row = "This teacher is free on this day, this time"
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS availability (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    faculty_id  BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day         TEXT NOT NULL CHECK (day IN (
                    'Monday','Tuesday','Wednesday',
                    'Thursday','Friday','Saturday','Sunday')),
    start_time  TEXT NOT NULL,                  -- '09:00' (24h)
    end_time    TEXT NOT NULL,                  -- '12:00' (24h)
    room        TEXT,                           -- 'Room 305' / 'Online'
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT availability_time_order CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_availability_faculty
    ON availability (faculty_id, day);

-- ---------------------------------------------------------------------
-- 3. SESSIONS  (keeps users logged in)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token       TEXT NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions (user_id);

-- ---------------------------------------------------------------------
-- SECURITY: RLS ON, no public policies.
-- The app reads/writes only from the server with the service role key
-- (which bypasses RLS). The anon key can see NOTHING. 🔒
-- ---------------------------------------------------------------------
ALTER TABLE users       ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions    ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- SEED DATA — CCS
-- Passwords: Admin@123 · Faculty@123 · Student@123
-- ---------------------------------------------------------------------
INSERT INTO users (email, password_hash, role, first_name, last_name, specialization, room)
VALUES
    ('admin@ccs.edu.ph',
     '$2b$10$qNB7IRqF0DeukDZEOxUWceZMOejV4w6aI4CfAq6/UE8RMgjl5EC4q',
     'admin', 'System', 'Administrator', NULL, NULL),
    ('j.cruz@ccs.edu.ph',
     '$2b$10$4ELNcWUzR9wEszqGKW6T0O/52GfWMkDHA7ok5KLubt8T3Q.Z4.O7.',
     'faculty', 'Juan', 'Cruz', 'Artificial Intelligence', 'Room 305'),
    ('m.santos@ccs.edu.ph',
     '$2b$10$4ELNcWUzR9wEszqGKW6T0O/52GfWMkDHA7ok5KLubt8T3Q.Z4.O7.',
     'faculty', 'Maria', 'Santos', 'Networks & Security', 'Room 307'),
    ('juan@student.ccs.edu.ph',
     '$2b$10$XCH3NXFh.1xWTp1lAgsZa.bLyXlPsDdR1AW9PSJ1wSOCE8xOLD.KS',
     'student', 'Juan', 'Dela Cruz', NULL, NULL)
ON CONFLICT (email) DO NOTHING;

-- Sample availability (only if table is empty)
INSERT INTO availability (faculty_id, day, start_time, end_time, room)
SELECT u.id, v.day, v.start_time, v.end_time, v.room
FROM users u
JOIN (VALUES
    ('j.cruz@ccs.edu.ph',    'Monday',    '09:00', '12:00', 'Room 305'),
    ('j.cruz@ccs.edu.ph',    'Wednesday', '13:00', '16:00', 'Room 305'),
    ('m.santos@ccs.edu.ph',  'Tuesday',   '10:00', '13:00', 'Room 307'),
    ('m.santos@ccs.edu.ph',  'Thursday',  '09:00', '11:00', 'Online')
) AS v(email, day, start_time, end_time, room) ON v.email = u.email
WHERE NOT EXISTS (SELECT 1 FROM availability);
