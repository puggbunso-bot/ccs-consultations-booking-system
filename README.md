# 🎓 CCS Faculty Consultation Booking System

**Purpose:** Faculty set the **exact dates** (plus time window and room) they are
available. Students **book** a slot (date + start time + length). The faculty
**approves or declines**. The two then share an **online meeting link** in a
per-booking chatbox.

Simple · Clean UI · **No email** — everything happens **in-app**.

---

## 🚀 Quick Start

```bash
npm install
npm run dev
```

Open **http://localhost:3000**

> Requires `.env.local` with Supabase keys (already provided in this project).

Production build:

```bash
npm run build
npm start
```

---

## 🔑 Test Accounts

**Password for all test accounts: `testpassword`**

| Role | Email |
|------|-------|
| 🛡️ Admin | `test.admin1@gmail.com` |
| 👨‍🏫 Faculty | `test.faculty1@gmail.com` … `test.faculty4@gmail.com` |
| 👨‍🎓 Student | `test.student1@gmail.com`, `test.student2@gmail.com` |

**Original seed accounts** (`db/schema.sql`):

| Role | Email | Password |
|------|-------|----------|
| 🛡️ Admin | `admin@ccs.edu.ph` | `Admin@123` |
| 👨‍🏫 Faculty | `j.cruz@ccs.edu.ph` | `Faculty@123` |
| 👨‍🏫 Faculty | `m.santos@ccs.edu.ph` | `Faculty@123` |
| 👨‍🎓 Student | `juan@student.ccs.edu.ph` | `Student@123` |

> **Self-registration:** anyone can register as a **student or faculty**. The
> account is created **pending** and **cannot sign in** until the **admin
> approves** it from `/admin`. There is no demo-accounts box on the login page.

---

## 👥 Roles & Functions

### 👨‍🎓 Student
| # | Function |
|---|----------|
| F1 | Login / Logout · Register (waits for admin approval) |
| F2 | **Browse + search** the CCS faculty list (name or specialization) |
| F3 | ⭐ **View a teacher's schedule** — a **dropdown of the exact dates** the professor set; picking one shows that date's time + room only |
| F4 | ⭐ **Book a slot** — the fixed date, a start time, and a **duration** (30 min → whole window) |
| F5 | View my bookings (upcoming / past) · **Cancel** a booking |
| F6 | Open the **chatbox** at the scheduled time · share/view the meeting link |
| F7 | Read in-app **notifications** |

### 👨‍🏫 Faculty
| # | Function |
|---|----------|
| F8 | Login / Logout · Register (waits for admin approval) |
| F9 | Add / edit / delete my availability (**exact date** + time window + room) — deletion asks **Yes / Cancel** first |
| F10 | View booking requests · **Approve / Decline** · Cancel |
| F11 | **Share the online meeting link** in the booking's chatbox |
| F12 | Read in-app **notifications** |

### 🛡️ Admin
| # | Function |
|---|----------|
| F13 | Login / Logout |
| F14 | **Approve** pending registrations |
| F15 | Manage accounts — add (auto-approved) / deactivate / reactivate / **delete (Yes / Cancel modal)** |
| F16 | View all accounts and all faculty schedules · **delete any schedule (Yes / Cancel modal)** |

---

## 🗄️ Database (Supabase — 6 tables)

| Table | Purpose |
|-------|---------|
| `users` | Accounts with role + **approval status** (`active` / `inactive` / `pending`) |
| `availability` ⭐ | Faculty's **exact date** + time **window** + room (no "recurring" rows) |
| `sessions` | Login sessions (httpOnly cookie) |
| `bookings` | Date + start time + duration → `pending` → `approved` / `rejected` / `cancelled` |
| `notifications` | In-app bell + navbar unread badge |
| `messages` | Per-booking chatbox — **https links only** |

**Security:** RLS enabled with **no public policies** on all 6 tables — the app
reads/writes only through the server with the service-role key. The anon key can
see nothing.

See [`DATABASE_DESIGN.md`](./DATABASE_DESIGN.md) for the full design.

### Re-run schema / seed
```bash
$env:SUPABASE_ACCESS_TOKEN = "sbp_..."   # from supabase.txt
node scripts/setup-db.mjs db/schema.sql
node scripts/setup-db.mjs db/001_allow_pending_status.sql
node scripts/setup-db.mjs db/002_booking_notifications_chat.sql
node scripts/setup-db.mjs db/003_availability_specific_date.sql
node scripts/setup-db.mjs db/004_reset_schedules_bookings.sql   # wipe demo schedules/bookings
node scripts/setup-db.mjs db/005_availability_date_required.sql # date NOT NULL — no recurring rows
node scripts/setup-db.mjs db/seed-test-accounts.sql
```

---

## 🧭 Routes

| Route | Who | What |
|-------|-----|------|
| `/` | public | Homepage |
| `/login`, `/register` | public | Sign in / sign up |
| `/browse` | student | Faculty list **+ search** |
| `/browse/[id]` | student | One faculty's schedule — **date dropdown** → that date's time + room |
| `/book/[id]` | student | **Booking form** — date → start time → duration |
| `/bookings` | student | My bookings |
| `/bookings/[id]` | both | Booking detail + **chatbox** |
| `/faculty` | faculty | My availability (add / edit / delete) |
| `/faculty/bookings` | faculty | Requests to approve / decline |
| `/faculty/edit/[id]` | faculty | Edit one availability row |
| `/notifications` | all | In-app notifications |
| `/admin` | admin | User management + all schedules |

**Access control:** every page checks the role — a student visiting `/admin`
bounces to `/browse`, faculty visiting `/bookings` go to `/faculty`, and a
booking's detail page returns **404** for anyone who is not one of its two
participants.

---

## 🗄️ Booking Rules

* **Students see only what the faculty set** — `/browse/[id]` shows a **dropdown
  of the exact dates** the professor picked (e.g. `Oct 29, 2026 · Thursday`,
  `Oct 30, 2026 · Friday`). Choosing a date reveals **that date's** time window
  and room. Nothing else is invented: a teacher who set no schedule shows
  *"This teacher has not set their availability yet."*
* **Exact date, no "recurring"** — every `availability` row carries a real
  `date` (`NOT NULL`, migration `005`). The `day` column is **derived from the
  date** server-side, so the two can never disagree.
* **Flexible duration** — a window like `2026-10-29 10:00–13:00` is fully
  bookable: the student picks a **start time** (every 30 min) and a **duration**
  (`30 min · 1 hr · 1 hr 30 · 2 hrs · 2 hrs 30 · 3 hrs …`) that fits the window.
* **Server rejects the wrong date** — posting a date other than the one the
  faculty set returns `… is only available on Oct 29, 2026.`
* **No double booking** — overlapping `pending`/`approved` bookings for the same
  faculty + date block the slot. Taken starts show as **"Booked"**, and the
  server re-checks the overlap so a tampered form is rejected.
* **Delete asks first** — every **Delete** in `/admin` and `/faculty` opens a
  **Yes / Cancel** modal (`ConfirmDelete.tsx`); nothing is removed on a stray click.
* **Chatbox** — locked until the scheduled date+time, then open. Only the booked
  student and faculty, and only **`https://` meeting links** (validated on the
  client and the server).
* **Past bookings** can no longer be decided or cancelled.

---

## 📁 Project Structure

```
ccs-consultations-booking-system/    # repo root = the Next.js app
├── README.md                        # this file
├── DATABASE_DESIGN.md               # full data model
├── package.json                     # Next.js 16 + TypeScript
├── .env.example                     # copy to .env.local and fill in
├── db/
│   ├── schema.sql                          # users, availability, sessions
│   ├── 001_allow_pending_status.sql        # users.status = 'pending'
│   ├── 002_booking_notifications_chat.sql  # bookings, notifications, messages
│   ├── 003_availability_specific_date.sql  # availability.date column
│   ├── 004_reset_schedules_bookings.sql    # wipe demo schedules + bookings
│   ├── 005_availability_date_required.sql  # date NOT NULL (no recurring rows)
│   └── seed-test-accounts.sql              # test.*@gmail.com accounts
├── scripts/setup-db.mjs      # Runs a SQL file against Supabase
└── src/
    ├── lib/
    │   ├── supabase.ts        # Server-only client (service role)
    │   ├── auth.ts            # Session helpers + requireRole
    │   ├── actions.ts         # Auth / user / availability actions
    │   ├── booking-actions.ts # Booking, notify, chat actions
    │   ├── format.ts          # Time/date/status formatting
    │   └── types.ts           # TypeScript types
    ├── components/
    │   ├── Nav.tsx            # Role-aware nav + unread bell badge
    │   ├── BookingForm.tsx    # Fixed date → start time → duration picker
    │   ├── ScheduleByDate.tsx # Student date dropdown (only what faculty set)
    │   ├── ConfirmDelete.tsx  # Yes / Cancel delete modal
    │   ├── DateField.tsx      # Date picker showing the weekday live
    │   ├── Chatbox.tsx        # Link-sharing chat
    │   └── FacultySearch.tsx  # Live search
    └── app/
        ├── page.tsx           # Public homepage
        ├── login/ register/   # Auth
        ├── browse/ browse/[id]/  # Student: list + date-dropdown schedule
        ├── book/[id]/         # Student: booking form
        ├── bookings/ bookings/[id]/  # Student: my bookings + detail
        ├── faculty/ faculty/bookings/ faculty/edit/[id]/
        ├── notifications/     # In-app notifications
        └── admin/             # Admin: users + recent bookings + schedules
```

---

## 🛠️ Tech Stack

- **Next.js 16** (App Router, Server Actions, `cacheComponents`) + **TypeScript**
- **React 19**
- **Supabase** (PostgreSQL, hosted) via `@supabase/supabase-js` — service-role on the server only
- **bcryptjs** password hashing · httpOnly session cookies
- Plain CSS (no framework)

---

## ✅ Tested Flows (self-run)

- [x] Public homepage — correct heading order, no login required
- [x] Register (student & faculty) → `pending` → **pending login blocked** with the right message
- [x] Admin login → approve banner → **Approve** → the user can sign in
- [x] Search bar: `Prof` → 6, `Cruz` → 1, `zzzz` → 0 + empty state, clear → 6
- [x] Booking: 6 start times on a 3-hr window; durations `30 min` … `3 hrs`
- [x] Booking created `10:00–12:00` (2 hrs) → card + `Pending` pill in My Bookings
- [x] **Double booking:** overlapping starts disabled as **"Booked"**; `12:00` only offers `30 min`/`1 hr`
- [x] **Server-side overlap rejection** on tampered hidden fields
- [x] Faculty **Approve** (`Booking approved.`) · **Decline** (`Booking declined.`)
- [x] Student **Cancel** · past bookings move to the "Past & cancelled" section
- [x] Notifications: list, mark read, **navbar badge 3 → 0**
- [x] Chatbox **LOCKED** for a future booking · **OPEN** once the time has passed
- [x] Non-link blocked by `type=url` **and** the server
     (`Chatbox accepts online meeting links only (https://…).`)
- [x] Valid Meet link shared by the prof → the student sees it under the prof's name
- [x] Availability **Add / Edit / Delete**
- [x] Faculty sets an **exact date** — weekday shown live while picking
      (`Oct 29 → "Thursdays"`, `Oct 30 → "Fridays"`)
- [x] **No "recurring" rows anywhere** — faculty, admin and student tables show
      a real date only (migration `005` made `availability.date` NOT NULL)
- [x] Cleanup migration `004` wipes demo schedules/bookings, **keeps all accounts**
- [x] Student **date dropdown** shows only the dates the faculty set
- [x] **Yes / Cancel delete modal** on `/admin` and `/faculty`
- [x] Server rejects a booking posted for the wrong date
- [x] Admin **Recent bookings** shows the student's name
- [x] **All accounts sign in with the right identity** — `test.admin1`, `test.faculty1`–`4`, `test.student1`–`2` (`.nav-name` verified after each login)
- [x] **Deactivated** login blocked (`This account is deactivated…`) → admin **Activate** → signs in again
- [x] **Register → pending → blocked → admin approves → signs in** end to end
- [x] Chatbox **`http://` link rejected**, **`https://` link shared** by student and faculty (both visible in the thread)
- [x] **Accept rule — inside the free window:** prof free `10:00 AM – 1:00 PM`, student books `10:30–11:30` → faculty **Approve** → `Booking approved.`
- [x] **Accept rule — conflict refused:** pending `11:00–12:00` overlaps an approved `10:30–11:30` → Approve → *"That time is already booked (… overlaps another approved consultation)."*
- [x] **Accept rule — outside window refused:** pending `2:00–3:00 PM` (outside `10:00–13:00`) → Approve → *"That request is outside your free schedule…"*
- [x] **Navbar is one row** at 1096px — brand text hides in 961–1140px, no wrap, no horizontal overflow, hamburger takes over ≤960px
- [x] **`/profile` page** for all 3 roles — avatar initials, role + status pills, account details, role-aware "At a glance" stats (faculty / student / admin)
- [x] **Left sidebar** replaces the top navbar for every signed-in user (admin / faculty / student) — brand, avatar card → profile, role-specific links with an active state, unread badge, role badge + logout pinned at the bottom
- [x] **Sidebar active-link logic** — the *most specific* link lights up (`/faculty/bookings` → "Booking Requests", not also "My Schedule")
- [x] **Sidebar mobile drawer** (≤960px) — hamburger opens the slide-in sidebar + scrim, body-scroll locks, Escape / scrim / any link closes it
- [x] **Sidebar layout has no overflow** — content clears the 256px column on every page for all 3 roles (`.grid-2 > * { min-width: 0 }` lets wide tables scroll instead of pushing the page wide)
- [x] **Profile: cover + overlapping avatar** — role-coloured cover banner with blurred role/status badges, 92px avatar, name / email / member-since
- [x] **Edit profile** — a signed-in user updates their own first/last name (and specialization + room for faculty); server action `updateProfileAction` revalidates the layout so the sidebar name refreshes
- [x] Booking errors are **shown on the page** (`/book` and `/browse` now render `?error=` / `?ok=`)
- [x] Admin **create / deactivate / delete** user; inactive faculty hidden from `/browse`
- [x] **404** for a non-participant opening `/bookings/<id>`
- [x] **Role access control** for every page (admin / student / faculty)
- [x] **Lighthouse 1.0 / 1.0 / 1.0** on `/`, `/login`, `/register`, `/browse`, `/bookings`, `/notifications`
- [x] `npx eslint src --max-warnings=0` + `npm run build` pass, no console errors
