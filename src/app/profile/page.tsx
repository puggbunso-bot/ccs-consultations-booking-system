import Link from "next/link";
import { requireRole, homeFor } from "@/lib/auth";
import { db } from "@/lib/supabase";
import { displayName, formatDate } from "@/lib/format";

type Stat = { value: number; label: string };

const statusPill = (status: string) =>
  status === "active"
    ? "pill pill-approved"
    : status === "pending"
      ? "pill pill-pending"
      : "pill pill-rejected";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const user = await requireRole("admin", "faculty", "student");
  const { error, ok } = await searchParams;
  const today = new Date().toISOString().slice(0, 10);

  // ---- "At a glance" numbers (role-aware) --------------------------------
  let stats: Stat[] = [];
  let statNote = "";

  if (user.role === "student") {
    const [total, approved, upcoming] = await Promise.all([
      db().from("bookings").select("id", { count: "exact", head: true }).eq("student_id", user.id),
      db()
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("student_id", user.id)
        .eq("status", "approved"),
      db()
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("student_id", user.id)
        .in("status", ["pending", "approved"])
        .gte("date", today),
    ]);
    stats = [
      { value: total.count ?? 0, label: "Requests sent" },
      { value: approved.count ?? 0, label: "Approved" },
      { value: upcoming.count ?? 0, label: "Upcoming" },
    ];
    statNote = "Your consultation requests with CCS faculty.";
  } else if (user.role === "faculty") {
    const [schedule, pending, upcoming] = await Promise.all([
      db()
        .from("availability")
        .select("id", { count: "exact", head: true })
        .eq("faculty_id", user.id)
        .gte("date", today),
      db()
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("faculty_id", user.id)
        .eq("status", "pending"),
      db()
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("faculty_id", user.id)
        .eq("status", "approved")
        .gte("date", today),
    ]);
    stats = [
      { value: schedule.count ?? 0, label: "Free dates set" },
      { value: pending.count ?? 0, label: "Waiting for you" },
      { value: upcoming.count ?? 0, label: "Upcoming talks" },
    ];
    statNote = "Your schedule and the requests on it.";
  } else {
    const [accounts, waiting, bookings] = await Promise.all([
      db().from("users").select("id", { count: "exact", head: true }).neq("role", "admin"),
      db().from("users").select("id", { count: "exact", head: true }).eq("status", "pending"),
      db().from("bookings").select("id", { count: "exact", head: true }),
    ]);
    stats = [
      { value: accounts.count ?? 0, label: "CCS accounts" },
      { value: waiting.count ?? 0, label: "Awaiting approval" },
      { value: bookings.count ?? 0, label: "Bookings recorded" },
    ];
    statNote = "Everything happening across the system.";
  }

  const initials = `${user.first_name[0] ?? ""}${user.last_name[0] ?? ""}`.toUpperCase();

  return (
    <>
      <div className="page-head">
        <h1>My Profile</h1>
        <p>Your CCS account — who you are in the consultation system.</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {ok && <div className="alert alert-ok">{ok}</div>}

      {/* ---------------- Hero ---------------- */}
      <div className="card profile-hero">
        <div className={`profile-avatar profile-${user.role}`} aria-hidden="true">
          {initials}
        </div>

        <div className="profile-id">
          <h2 className="profile-name">{displayName(user)}</h2>
          <div className="profile-meta">
            <span className={`role-badge role-${user.role}`}>{user.role}</span>
            <span className={statusPill(user.status)}>{user.status}</span>
          </div>
          <p className="muted">{user.email}</p>
        </div>

        <div className="profile-actions">
          <Link href={homeFor(user.role)} className="btn btn-small">
            My dashboard
          </Link>
          <Link href="/notifications" className="btn btn-ghost btn-small">
            Notifications
          </Link>
        </div>
      </div>

      <div className="grid-2 mt-2">
        {/* ---------------- Details ---------------- */}
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Account details</h3>
          <dl className="kv">
            <dt>Full name</dt>
            <dd>
              {user.first_name} {user.last_name}
            </dd>

            <dt>Email</dt>
            <dd>{user.email}</dd>

            <dt>Role</dt>
            <dd>
              <span className={`role-badge role-${user.role}`}>{user.role}</span>
            </dd>

            {user.role === "faculty" && user.specialization && (
              <>
                <dt>Specialization</dt>
                <dd>{user.specialization}</dd>
              </>
            )}

            {user.role === "faculty" && user.room && (
              <>
                <dt>Default room</dt>
                <dd>{user.room}</dd>
              </>
            )}

            <dt>College</dt>
            <dd>College of Computer Studies</dd>

            <dt>Member since</dt>
            <dd>{formatDate(user.created_at.slice(0, 10))}</dd>
          </dl>
        </div>

        {/* ---------------- Stats ---------------- */}
        <div className="card">
          <h3 style={{ marginTop: 0 }}>At a glance</h3>
          <div className="profile-stats">
            {stats.map((s) => (
              <div className="stat" key={s.label}>
                <b>{s.value}</b>
                <span>{s.label}</span>
              </div>
            ))}
          </div>
          <p className="muted small mt-2" style={{ textAlign: "center" }}>
            {statNote}
          </p>
        </div>
      </div>
    </>
  );
}
