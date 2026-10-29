import { requireRole } from "@/lib/auth";
import { db } from "@/lib/supabase";
import { formatDate } from "@/lib/format";
import { updateProfileAction } from "@/lib/booking-actions";

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
  }

  const initials = `${user.first_name[0] ?? ""}${user.last_name[0] ?? ""}`.toUpperCase();
  const joined = formatDate(user.created_at.slice(0, 10));

  return (
    <>
      {/* ---------------- Cover + avatar ---------------- */}
      <div className={`profile-cover cover-${user.role}`}>
        <div className="cover-badges">
          <span className={`role-badge role-${user.role}`}>{user.role}</span>
          <span className={statusPill(user.status)}>{user.status}</span>
        </div>
      </div>

      <div className="phead">
        <div className={`profile-avatar profile-${user.role}`} aria-hidden="true">
          {initials}
        </div>
        <div className="profile-id">
          <h1 className="profile-name">
            {user.role === "faculty" ? "Prof. " : ""}
            {user.first_name} {user.last_name}
          </h1>
          <p className="profile-email">{user.email}</p>
          <p className="profile-joined">Member since {joined}</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {ok && <div className="alert alert-ok">{ok}</div>}

      {/* ---------------- Stats ---------------- */}
      <div className="profile-stats">
        {stats.map((s) => (
          <div className="stat" key={s.label}>
            <b>{s.value}</b>
            <span>{s.label}</span>
          </div>
        ))}
      </div>

      <div className="grid-2 mt-2">
        {/* ---------------- Account details ---------------- */}
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Account details</h3>
          <dl className="kv">
            <dt>Full name</dt>
            <dd>
              {user.first_name} {user.last_name}
            </dd>

            <dt>Email</dt>
            <dd className="break">{user.email}</dd>

            <dt>Role</dt>
            <dd>
              <span className={`role-badge role-${user.role}`}>{user.role}</span>
            </dd>

            {user.role === "faculty" && (
              <>
                <dt>Specialization</dt>
                <dd>{user.specialization || "—"}</dd>

                <dt>Default room</dt>
                <dd>{user.room || "—"}</dd>
              </>
            )}

            <dt>College</dt>
            <dd>College of Computer Studies</dd>

            <dt>Account status</dt>
            <dd>
              <span className={statusPill(user.status)}>{user.status}</span>
            </dd>

            <dt>Member since</dt>
            <dd>{joined}</dd>
          </dl>
        </div>

        {/* ---------------- Edit profile ---------------- */}
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Edit profile</h3>
          <p className="muted small" style={{ marginTop: "-0.4rem" }}>
            Update how you appear to others in the consultation system.
          </p>

          <form action={updateProfileAction} className="form-grid">
            <div className="form-row">
              <label className="form-field">
                <span>First name</span>
                <input name="first_name" defaultValue={user.first_name} required maxLength={60} />
              </label>
              <label className="form-field">
                <span>Last name</span>
                <input name="last_name" defaultValue={user.last_name} required maxLength={60} />
              </label>
            </div>

            {user.role === "faculty" && (
              <div className="form-row">
                <label className="form-field">
                  <span>Specialization</span>
                  <input
                    name="specialization"
                    defaultValue={user.specialization ?? ""}
                    placeholder="e.g. Software Engineering"
                    maxLength={80}
                  />
                </label>
                <label className="form-field">
                  <span>Default room</span>
                  <input
                    name="room"
                    defaultValue={user.room ?? ""}
                    placeholder="e.g. Room 401"
                    maxLength={40}
                  />
                </label>
              </div>
            )}

            <p className="muted small">
              Your email and role are managed by the administrator and can’t be changed here.
            </p>

            <div>
              <button type="submit" className="btn">
                Save changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
