-- 004 — Reset demo data so the schedule tables start clean.
-- Keeps every user/account (admin, faculty, students) so login still works.
-- Deletes: messages -> notifications -> bookings -> availability.
-- Account-level notifications (e.g. "your account was approved") are kept.

BEGIN;

-- Chat messages live only inside bookings (FK ON DELETE CASCADE).
DELETE FROM messages;

-- Booking-related notifications (requested / approved / rejected / cancelled
-- / new_link). Account-level notices ("your account was approved") are kept.
DELETE FROM notifications
WHERE type LIKE 'booking\_%' OR type = 'new_link';

DELETE FROM bookings;

DELETE FROM availability;

COMMIT;

SELECT
  (SELECT count(*) FROM users)        AS users_left,
  (SELECT count(*) FROM availability) AS availability_left,
  (SELECT count(*) FROM bookings)     AS bookings_left,
  (SELECT count(*) FROM notifications) AS notifications_left;
