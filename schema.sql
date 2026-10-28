-- =====================================================================
-- CCS FACULTY CONSULTATION SCHEDULING SYSTEM — SIMPLE VERSION
-- Purpose: Faculty set their available days/times.
--          Students view when a teacher is free.
-- Engine : SQLite
-- Tables : 3 (users, availability, sessions)
-- =====================================================================

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------
-- 1. USERS  (faculty + student accounts)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT    NOT NULL UNIQUE,
    password_hash TEXT    NOT NULL,
    role          TEXT    NOT NULL CHECK (role IN ('admin','faculty','student')),
    first_name    TEXT    NOT NULL,
    last_name     TEXT    NOT NULL,
    specialization TEXT,                       -- faculty only (e.g. "AI")
    room          TEXT,                        -- default room (faculty only)
    status        TEXT    NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','inactive')),
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------
-- 2. AVAILABILITY  ⭐ THE CORE TABLE
--    One row = "I am free on this day, this time"
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS availability (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    faculty_id INTEGER NOT NULL,
    day        TEXT    NOT NULL CHECK (day IN (
                   'Monday','Tuesday','Wednesday',
                   'Thursday','Friday','Saturday','Sunday')),
    start_time TEXT    NOT NULL,              -- '09:00' (24hr)
    end_time   TEXT    NOT NULL,              -- '12:00' (24hr)
    room       TEXT,                          -- 'Room 305' or 'Online'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CHECK (end_time > start_time),            -- end must be after start
    FOREIGN KEY (faculty_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Fast lookup: "show me all of Prof. Cruz's schedule"
CREATE INDEX IF NOT EXISTS idx_availability_faculty
    ON availability (faculty_id, day);

-- ---------------------------------------------------------------------
-- 3. SESSIONS  (keeps users logged in)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL,
    token      TEXT    NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =====================================================================
-- SEED DATA — CCS
-- =====================================================================

-- Admin account  (password: Admin@123 — change in production)
INSERT OR IGNORE INTO users
(id, email, password_hash, role, first_name, last_name, status)
VALUES
(1, 'admin@ccs.edu.ph', '$2b$10$REPLACE_WITH_BCRYPT_HASH', 'admin',
    'System', 'Administrator', 'active');

-- Faculty account  (password: Faculty@123 — change in production)
INSERT OR IGNORE INTO users
(id, email, password_hash, role, first_name, last_name, specialization, room, status)
VALUES
(2, 'j.cruz@ccs.edu.ph', '$2b$10$REPLACE_WITH_BCRYPT_HASH', 'faculty',
    'Juan', 'Cruz', 'Artificial Intelligence', 'Room 305', 'active');

INSERT OR IGNORE INTO users
(id, email, password_hash, role, first_name, last_name, specialization, room, status)
VALUES
(3, 'm.santos@ccs.edu.ph', '$2b$10$REPLACE_WITH_BCRYPT_HASH', 'faculty',
    'Maria', 'Santos', 'Networks & Security', 'Room 307', 'active');

-- Student account (password: Student@123 — change in production)
INSERT OR IGNORE INTO users
(id, email, password_hash, role, first_name, last_name, status)
VALUES
(4, 'juan@student.ccs.edu.ph', '$2b$10$REPLACE_WITH_BCRYPT_HASH', 'student',
    'Juan', 'Dela Cruz', 'active');

-- Sample availability
INSERT OR IGNORE INTO availability (faculty_id, day, start_time, end_time, room) VALUES
(2, 'Monday',    '09:00', '12:00', 'Room 305'),
(2, 'Wednesday', '13:00', '16:00', 'Room 305'),
(3, 'Tuesday',   '10:00', '13:00', 'Room 307'),
(3, 'Thursday',  '09:00', '11:00', 'Online');
