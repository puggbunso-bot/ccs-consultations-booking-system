-- =====================================================================
-- TEST ACCOUNTS — password for ALL: testpassword
--   1 admin · 4 faculty · 2 students
-- Re-runnable: skips rows that already exist (ON CONFLICT DO NOTHING)
-- =====================================================================

INSERT INTO users (email, password_hash, role, first_name, last_name, specialization, room)
VALUES
    -- admin
    ('test.admin1@gmail.com',
     '$2b$10$o/t14KfEoiMWNk1cqkKp7ObIk38GAT1x3.QWiIykgEL07vMVawpLq',
     'admin', 'Test', 'Admin', NULL, NULL),

    -- faculty (4)
    ('test.faculty1@gmail.com',
     '$2b$10$o/t14KfEoiMWNk1cqkKp7ObIk38GAT1x3.QWiIykgEL07vMVawpLq',
     'faculty', 'Antonio', 'Reyes', 'Software Engineering', 'Room 401'),
    ('test.faculty2@gmail.com',
     '$2b$10$o/t14KfEoiMWNk1cqkKp7ObIk38GAT1x3.QWiIykgEL07vMVawpLq',
     'faculty', 'Elena', 'Villanueva', 'Cybersecurity', 'Room 402'),
    ('test.faculty3@gmail.com',
     '$2b$10$o/t14KfEoiMWNk1cqkKp7ObIk38GAT1x3.QWiIykgEL07vMVawpLq',
     'faculty', 'Ramon', 'Bautista', 'Data Science', 'Room 403'),
    ('test.faculty4@gmail.com',
     '$2b$10$o/t14KfEoiMWNk1cqkKp7ObIk38GAT1x3.QWiIykgEL07vMVawpLq',
     'faculty', 'Cristine', 'Lim', 'Human-Computer Interaction', 'Room 404'),

    -- students (2)
    ('test.student1@gmail.com',
     '$2b$10$o/t14KfEoiMWNk1cqkKp7ObIk38GAT1x3.QWiIykgEL07vMVawpLq',
     'student', 'Alex', 'Ramos', NULL, NULL),
    ('test.student2@gmail.com',
     '$2b$10$o/t14KfEoiMWNk1cqkKp7ObIk38GAT1x3.QWiIykgEL07vMVawpLq',
     'student', 'Grace', 'Torres', NULL, NULL)
ON CONFLICT (email) DO NOTHING;

-- Sample availability for the test faculty (only if they have none yet)
INSERT INTO availability (faculty_id, day, start_time, end_time, room)
SELECT u.id, v.day, v.start_time, v.end_time, v.room
FROM users u
JOIN (VALUES
    ('test.faculty1@gmail.com', 'Monday',    '08:00', '10:00', 'Room 401'),
    ('test.faculty1@gmail.com', 'Thursday',  '13:00', '15:00', 'Room 401'),
    ('test.faculty2@gmail.com', 'Tuesday',   '09:00', '11:00', 'Room 402'),
    ('test.faculty2@gmail.com', 'Friday',    '14:00', '16:00', 'Room 402'),
    ('test.faculty3@gmail.com', 'Monday',    '13:00', '15:00', 'Room 403'),
    ('test.faculty3@gmail.com', 'Wednesday', '08:00', '10:00', 'Room 403'),
    ('test.faculty4@gmail.com', 'Wednesday', '10:00', '12:00', 'Room 404'),
    ('test.faculty4@gmail.com', 'Friday',    '09:00', '11:00', 'Online')
) AS v(email, day, start_time, end_time, room) ON v.email = u.email
WHERE NOT EXISTS (SELECT 1 FROM availability a WHERE a.faculty_id = u.id);
