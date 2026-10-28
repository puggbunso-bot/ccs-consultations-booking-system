-- cleanup: remove the booking created during this verification session
-- (Alex Ramos, Nov 3 2026, 10:00-10:30) and the notifications it generated.
delete from bookings
where date = date '2026-11-03'
  and start_time = '10:00'
  and end_time  = '10:30';

delete from notifications
where body like '%10:00–10:30%';

select
  (select count(*) from bookings)      as bookings_left,
  (select count(*) from notifications) as notifications_left;
