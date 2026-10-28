# CCS Faculty Consultation Booking System — DATABASE DESIGN

## 🎯 PURPOSE (one sentence)

> **Faculty publish the exact dates, times and rooms they are available.
> Students see only those dates — in a dropdown — and book a slot for a specific
> date, time and length. The faculty approves or declines. They then exchange an
> online meeting link in a per-booking chatbox.**

**No email.** Notifications are **in-app only** (the bell in the navbar).
The chatbox holds **online meeting links only** (Google Meet / Zoom / Teams…).

---

## 1. USERS / ACTORS

| # | Actor | Who | Can Do |
|---|-------|-----|--------|
| 1 | **Admin** | System administrator | Login · Add / approve / deactivate / delete accounts · View all schedules · Delete any availability |
| 2 | **Faculty** | CCS instructor/professor | Login · Add / edit / delete own availability · Approve / decline / cancel bookings · Share the meeting link |
| 3 | **Student** | CCS student | Login · Browse + **search** the faculty list · View a teacher's schedule · **Book a slot** (start time + duration) · Cancel own booking |

**`users.role` values:** `'admin'` | `'faculty'` | `'student'`
**`users.status` values:** `'active'` | `'inactive'` | **`'pending'`**

> 🔐 **Registration & approval:** anyone may register as a **student or faculty** —
> the account is created with `status = 'pending'` and **cannot sign in** until the
> **admin alone** flips it to `'active'`. Accounts the admin creates directly are
> approved automatically. Inactive accounts are hidden from the faculty list.

---

## 2. SQL TABLES (6 total)

| # | Table | Purpose |
|---|-------|---------|
| 1 | `users` | Login accounts for admin, faculty and students (with approval status) |
| 2 | `availability` ⭐ | **The core** — one row = one **exact date** + time window + room the faculty set |
| 3 | `sessions` | Keeps users logged in (`ccs_session` httpOnly cookie) |
| 4 | `bookings` | A student's request for a **specific date + start time + length**; approved / declined by the faculty |
| 5 | `notifications` | The in-app bell — unread count in the navbar |
| 6 | `messages` | The per-booking chatbox — **https meeting links only**, unlocks at the scheduled time |

> 📁 SQL files live in `db/`:
> `schema.sql` (tables 1–3 + seed) · `001_allow_pending_status.sql` ·
> `002_booking_notifications_chat.sql` (tables 4–6) ·
> `003_availability_specific_date.sql` (adds `availability.date`) ·
> `004_reset_schedules_bookings.sql` (wipes demo schedules/bookings) ·
> `005_availability_date_required.sql` (`date NOT NULL`, drops recurring rows) ·
> `seed-test-accounts.sql`

---

## 3. TABLE DETAILS

### 3.1 `users`

| Column | Type | Notes |
|--------|------|-------|
| `id` | BIGINT PK | identity |
| `email` | TEXT UNIQUE NOT NULL | login |
| `password_hash` | TEXT NOT NULL | bcrypt |
| `role` | TEXT | `admin` / `faculty` / `student` |
| `first_name`, `last_name` | TEXT NOT NULL | |
| `specialization` | TEXT | faculty only (e.g. "AI", "Networks & Security") |
| `room` | TEXT | faculty default room |
| `status` | TEXT | `active` / `inactive` / **`pending`** |
| `created_at` | TIMESTAMPTZ | |

### 3.2 `availability` ⭐

One row = *"This teacher is free on **this exact date**, in this time window,
in this room."* The **whole window is bookable** in flexible pieces (see §5).

| Column | Type | Notes |
|--------|------|-------|
| `id` | BIGINT PK | identity |
| `faculty_id` | BIGINT → users | cascade delete |
| `date` | DATE **NOT NULL** | **the exact date the faculty set** — students can book only this date |
| `day` | TEXT | `Monday` … `Sunday`, **derived from `date`** server-side (`weekdayOf()`) |
| `start_time` | TEXT | `'09:00'` (24h) |
| `end_time` | TEXT | `'12:00'` (24h) · CHECK `end_time > start_time` |
| `room` | TEXT | `'Room 305'` / `'Online'` |
| `created_at` | TIMESTAMPTZ | |

**Constraints**

* `availability_date_matches_day` — `EXTRACT(ISODOW FROM date)` must equal the
  weekday encoded in `day`, so the two columns can never disagree.
* Unique-ish guard in the app: one row per faculty per **date + start_time**
  (a duplicate is rejected with *"You are already available on 2026-10-29 at 09:00."*).
* `idx_availability_date` on `date` for the chronological student dropdown.

> ❌ **No recurring rows.** Before migration `005` a row could carry a weekday
> with `date IS NULL` (shown as *"recurring"*). `date` is now **NOT NULL**, every
> row has a real date, and no view renders the word "recurring" any more.

### 3.3 `sessions`

| Column | Type | Notes |
|--------|------|-------|
| `id` | BIGINT PK | identity |
| `user_id` | BIGINT → users | cascade delete |
| `token` | TEXT UNIQUE | random; stored in the `ccs_session` httpOnly cookie |
| `expires_at` | TIMESTAMPTZ | expiry |

### 3.4 `bookings`

| Column | Type | Notes |
|--------|------|-------|
| `id` | BIGINT PK | identity |
| `student_id` | BIGINT → users | who booked |
| `faculty_id` | BIGINT → users | who was booked |
| `availability_id` | BIGINT → availability | the schedule row it came from |
| `date` | DATE | **must equal `availability.date`** — validated server-side |
| `start_time` | TEXT | `'10:00'` (24h) |
| `end_time` | TEXT | `'12:00'` (24h) · CHECK `end_time > start_time` |
| `note` | TEXT | student's reason (optional) |
| `status` | TEXT | `pending` → `approved` / `rejected`, or `cancelled` |
| `created_at` | TIMESTAMPTZ | request time |
| `decided_at` | TIMESTAMPTZ | when faculty acted |

**Status flow**

```
pending ──approve──▶ approved ──(time passes)──▶ (past / read-only)
   │                     │
   └──decline──▶ rejected │
                          └──cancel──▶ cancelled   (student or faculty)
```

### 3.5 `notifications` (in-app only, no email)

| Column | Type | Notes |
|--------|------|-------|
| `id` | BIGINT PK | identity |
| `user_id` | BIGINT → users | recipient |
| `type` | TEXT | `booking_requested` / `booking_approved` / `booking_rejected` / `booking_cancelled` / `new_link` |
| `title`, `body` | TEXT | shown in the list |
| `link` | TEXT | where **View →** goes (e.g. `/bookings/4`) |
| `is_read` | BOOLEAN | drives the navbar 🔔 unread badge |
| `created_at` | TIMESTAMPTZ | |

### 3.6 `messages` (chatbox — link only)

| Column | Type | Notes |
|--------|------|-------|
| `id` | BIGINT PK | identity |
| `booking_id` | BIGINT → bookings | one chat per booking |
| `sender_id` | BIGINT → users | faculty or the booked student |
| `body` | TEXT | **must be an `https://` meeting link** (validated server-side) |
| `created_at` | TIMESTAMPTZ | |

---

## 4. SECURITY 🔒

* **RLS is ENABLED on all 6 tables with NO public policies** — the anon key sees
  **nothing**. Only the server (service-role key, `src/lib/supabase.ts`, server-only)
  reads/writes.
* Passwords are hashed with **bcryptjs**.
* Sessions are server-side rows + an **httpOnly cookie**; the service-role key
  never ships to the browser.
* Every page and every server action re-checks the session and the **role**
  (`requireRole` in `src/lib/auth.ts`); wrong-role visits redirect, and a
  booking's detail page returns **404** for anyone but its 2 participants.
* Booking/decision/chat actions re-validate on the **server**, so tampering with
  the form's hidden fields cannot bypass the rules.

---

## 5. HOW A BOOKING WORKS (flexible duration)

A faculty member publishes an **exact date + window**, e.g.
`2026-10-29 (Thursday) 10:00 – 13:00` (3 hours). That whole window is
automatically bookable — the student does **not** wait for pre-cut slots:

1. **Choose a date** — the student picks from a **dropdown of only the dates
   that professor set** (`/browse/[id]` → `ScheduleByDate.tsx`). Picking a date
   reveals **that date's** time window and room. A teacher who set nothing sees
   *"This teacher has not set their availability yet."*
2. **Pick a start time** — every 30 minutes inside the window (`10:00, 10:30, …, 12:30`).
3. **Pick a duration** — any **30-minute multiple** that fits the window:
   `30 min · 1 hr · 1 hr 30 · 2 hrs · 2 hrs 30 · 3 hrs …`
   Options that would run past the window or overlap an existing booking are
   shown disabled ("Unavailable").
4. **Reason** (optional) → **Request booking →** → status `pending`.

**Only the set date is accepted.** The booking form posts a hidden `date`; the
server compares it to `availability.date` and rejects anything else
(*"Prof. Antonio Reyes is only available on Oct 29, 2026."*).

**No double booking.** A start time / duration is **taken** when another booking
exists for the *same faculty + same date + overlapping time* with status
`pending` or `approved`. Taken start times render as **"Booked"** in the UI, and
the server re-checks the overlap, so a hand-crafted POST is rejected too
(`That time slot is already reserved (10:00–12:00).`).

**Decisions.** The faculty sees the request under *Booking Requests* and
**Approves** or **Declines**; either party may **Cancel**. Once the scheduled
time has passed, a booking can no longer be decided or cancelled.

**Chatbox.** On an `approved` booking, the detail page shows a chatbox that is
**LOCKED until the scheduled date+time**, then **OPEN**. Only the booked student
and the faculty can see it, and only **https meeting links** can be sent
(validated client- and server-side). Sending one notifies the other party.

---

## 6. PAGES / ROUTES

| Route | Who | What |
|-------|-----|------|
| `/` | public | Homepage — how it works, Sign in / Register |
| `/login` | public | Email + password sign-in |
| `/register` | public | Student / faculty sign-up → `pending` → admin approval |
| `/browse` | student | Faculty list **+ live search** (name or specialization) |
| `/browse/[id]` | student | One faculty's schedule — **date dropdown** → that date's time + room |
| `/book/[id]` | student | **Book** — date → start time → duration → reason |
| `/bookings` | student | My bookings — upcoming & pending / past & cancelled |
| `/bookings/[id]` | both | Booking detail + **chatbox** (link sharing) |
| `/faculty` | faculty | My availability — add / edit / delete |
| `/faculty/bookings` | faculty | Requests to approve or decline |
| `/faculty/edit/[id]` | faculty | Edit one availability row |
| `/notifications` | all | In-app notifications, mark read |
| `/admin` | admin | Add / approve / deactivate / delete users · all schedules |

---

## 7. FUNCTIONS

| Actor | Function |
|-------|----------|
| **Anyone** | Register (student/faculty → `pending`) · Sign in · Sign out · Browse the public homepage |
| **Admin** | Approve a pending account · Create an account (auto-approved) · Deactivate / reactivate · Delete (**Yes / Cancel modal**) · View all schedules |
| **Faculty** | Add / edit / delete availability (**Yes / Cancel modal**) · Approve / decline / cancel a booking · Send the meeting link · Read notifications |
| **Student** | Search the faculty list · View a schedule (**date dropdown**) · **Book a start time + duration** · Cancel own booking · Read notifications |

---

## 8. OLD vs NEW

| | v1 (schedule board only) | **v2 (booking system)** |
|---|---|---|
| Tables | 3 | **6** |
| Registration | admin-created only | **self-register + admin approval** |
| Student action | view only | **search · book · cancel** |
| Faculty action | set schedule | **+ approve / decline · share link** |
| Notifications | none | **in-app bell + unread badge** |
| Chatbox | none | **per booking · link-only · time-gated** |

*Old (v1): 3 tables, no booking, no approval, no notifications.
New (v2): 6 tables — `users`, `availability`, `sessions`, `bookings`, `notifications`, `messages`.*
