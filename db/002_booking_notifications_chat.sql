-- =====================================================================
-- 002 — BOOKING + NOTIFICATIONS + CHAT (link sharing)
--
--   bookings      : student books a specific date + time slot
--                   status: pending -> approved / rejected, or cancelled
--   notifications : in-app bell (no email)
--   messages      : chatbox — ONLINE LINK ONLY, opens at the scheduled time
--
-- Double-booking rule:
--   A slot is TAKEN when another booking exists for the same faculty,
--   same date, overlapping time, with status 'pending' or 'approved'.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. BOOKINGS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bookings (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    faculty_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    availability_id BIGINT NOT NULL REFERENCES availability(id) ON DELETE CASCADE,
    date            DATE NOT NULL,
    start_time      TEXT NOT NULL,               -- '09:00' (24h)
    end_time        TEXT NOT NULL,               -- '10:00' (24h)
    note            TEXT,                        -- reason for consultation
    status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','approved','rejected','cancelled')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    decided_at      TIMESTAMPTZ,
    CONSTRAINT booking_time_order CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_bookings_student ON bookings (student_id, date);
CREATE INDEX IF NOT EXISTS idx_bookings_faculty ON bookings (faculty_id, date);
CREATE INDEX IF NOT EXISTS idx_bookings_active  ON bookings (faculty_id, date, status);

-- ---------------------------------------------------------------------
-- 2. NOTIFICATIONS  (in-app only — no email)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        TEXT NOT NULL,                   -- booking_requested / approved / ...
    title       TEXT NOT NULL,
    body        TEXT NOT NULL,
    link        TEXT,                            -- where to go when clicked
    is_read     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user
    ON notifications (user_id, is_read, created_at DESC);

-- ---------------------------------------------------------------------
-- 3. MESSAGES  — chatbox
--    LINK ONLY. Only the 2 booked parties may read/write.
--    The app only allows writes once booking.start_time has been reached.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS messages (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    booking_id  BIGINT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    sender_id   BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body        TEXT NOT NULL,                   -- the online meeting link
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_booking ON messages (booking_id, created_at);

-- ---------------------------------------------------------------------
-- SECURITY — RLS ON, no public policies (same as the other tables).
-- The server uses the service-role key which bypasses RLS.
-- ---------------------------------------------------------------------
ALTER TABLE bookings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages      ENABLE ROW LEVEL SECURITY;
