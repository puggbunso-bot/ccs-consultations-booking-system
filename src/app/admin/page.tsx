import { requireRole } from "@/lib/auth";
import { db } from "@/lib/supabase";
import {
  adminApproveUserAction,
  adminCreateUserAction,
  adminDeleteUserAction,
  adminToggleStatusAction,
  deleteAvailabilityAction,
} from "@/lib/actions";
import { byWhen, displayName, formatDate, formatRange, statusLabel, weekdayOf } from "@/lib/format";
import ConfirmDelete from "@/components/ConfirmDelete";
import type { AvailabilityWithFaculty, BookingWithPeople, SessionUser } from "@/lib/types";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  await requireRole("admin");
  const { error, ok } = await searchParams;

  const [usersRes, availRes, bookingsRes] = await Promise.all([
    db().from("users").select("*").order("role").order("last_name"),
    db()
      .from("availability")
      .select("*, faculty:users!availability_faculty_id_fkey(id, first_name, last_name, role, specialization, room)")
      .order("day"),
    db()
      .from("bookings")
      .select(
        `*,
         student:users!bookings_student_id_fkey(id, first_name, last_name, email),
         faculty:users!bookings_faculty_id_fkey(id, first_name, last_name)`,
      )
      .order("date", { ascending: false })
      .order("start_time", { ascending: false })
      .limit(25),
  ]);

  const users = (usersRes.data ?? []) as SessionUser[];
  const pendingCount = users.filter((u) => u.status === "pending").length;
  const availability = byWhen(
    (availRes.data ?? []) as unknown as AvailabilityWithFaculty[],
  );
  const bookings = (bookingsRes.data ?? []) as BookingWithPeople[];

  return (
    <>
      <div className="page-head">
        <h1>🛡️ Admin — Manage Users &amp; Schedules</h1>
        <p>CCS accounts (faculty &amp; students) and everyone&apos;s availability.</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {ok && <div className="alert alert-ok">{ok}</div>}
      {pendingCount > 0 && (
        <div className="alert alert-pending">
          ⏳ {pendingCount} {pendingCount === 1 ? "account is" : "accounts are"}{" "}
          waiting for your approval — see the Accounts table below.
        </div>
      )}

      {/* ---------------- Create user ---------------- */}
      <div className="card">
        <h2>➕ Add a CCS user</h2>
        <form action={adminCreateUserAction} className="form-grid">
          <div className="form-row">
            <div>
              <label htmlFor="first_name">First name *</label>
              <input id="first_name" name="first_name" required />
            </div>
            <div>
              <label htmlFor="last_name">Last name *</label>
              <input id="last_name" name="last_name" required />
            </div>
          </div>

          <div className="form-row">
            <div>
              <label htmlFor="email">Email *</label>
              <input id="email" name="email" type="email" required placeholder="name@ccs.edu.ph" />
            </div>
            <div>
              <label htmlFor="password">Password * (min 6 chars)</label>
              <input id="password" name="password" type="password" required minLength={6} />
            </div>
          </div>

          <div className="form-row">
            <div>
              <label htmlFor="role">Role *</label>
              <select id="role" name="role" defaultValue="student">
                <option value="student">Student</option>
                <option value="faculty">Faculty</option>
              </select>
            </div>
            <div>
              <label htmlFor="specialization">Specialization (faculty only)</label>
              <input id="specialization" name="specialization" placeholder="e.g. Artificial Intelligence" />
            </div>
          </div>

          <div className="form-row">
            <div>
              <label htmlFor="room">Default room (faculty only)</label>
              <input id="room" name="room" placeholder="Room 305" />
            </div>
            <div className="right" style={{ alignSelf: "end" }}>
              <button type="submit" className="btn">
                Create user
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* ---------------- All users ---------------- */}
      <div className="card">
        <h2>👥 All accounts ({users.length})</h2>
        <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th className="right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{displayName(u)}</td>
                <td>{u.email}</td>
                <td>
                  <span className={`role-badge role-${u.role}`}>{u.role}</span>
                </td>
                <td>
                  <span className={`role-badge status-${u.status}`}>{u.status}</span>
                </td>
                <td>
                  <div className="actions">
                    {u.status === "pending" ? (
                      <form action={adminApproveUserAction}>
                        <input type="hidden" name="id" value={u.id} />
                        <button type="submit" className="btn btn-small btn-approve">
                          ✔ Approve
                        </button>
                      </form>
                    ) : (
                      <form action={adminToggleStatusAction}>
                        <input type="hidden" name="id" value={u.id} />
                        <button type="submit" className="btn btn-small">
                          {u.status === "active" ? "Deactivate" : "Activate"}
                        </button>
                      </form>
                    )}
                    <ConfirmDelete
                      action={adminDeleteUserAction}
                      fields={[{ name: "id", value: u.id }]}
                      title="Delete this account?"
                      message={`${displayName(u)} (${u.email}) will be removed permanently. This cannot be undone.`}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {/* ---------------- Recent bookings ---------------- */}
      <div className="card">
        <h2>🎫 Recent bookings ({bookings.length})</h2>
        {bookings.length === 0 ? (
          <p className="empty">No bookings yet.</p>
        ) : (
          <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Faculty</th>
                <th>When</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td>{b.student ? displayName({ ...b.student, role: "student" }) : "—"}</td>
                  <td>{b.faculty ? displayName({ ...b.faculty, role: "faculty" }) : "—"}</td>
                  <td className="sched-time">
                    {formatDate(b.date)} · {formatRange(b.start_time, b.end_time)}
                  </td>
                  <td>
                    <span className={`pill pill-${b.status}`}>{statusLabel(b.status)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* ---------------- All schedules ---------------- */}
      <div className="card">
        <h2>📅 All faculty schedules ({availability.length})</h2>
        {availability.length === 0 ? (
          <p className="empty">No availability set yet.</p>
        ) : (
          <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Faculty</th>
                <th>Date</th>
                <th>Day</th>
                <th>Time</th>
                <th>Room</th>
                <th className="right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {availability.map((a) => (
                <tr key={a.id}>
                  <td>{a.faculty ? displayName(a.faculty) : "—"}</td>
                  <td className="sched-date">{formatDate(a.date)}</td>
                  <td className="sched-day">{weekdayOf(a.date)}</td>
                  <td className="sched-time">{formatRange(a.start_time, a.end_time)}</td>
                  <td>{a.room ?? "—"}</td>
                  <td>
                    <div className="actions">
                      <ConfirmDelete
                        action={deleteAvailabilityAction}
                        fields={[
                          { name: "id", value: a.id },
                          { name: "from", value: "admin" },
                        ]}
                        title="Delete this schedule?"
                        message={`${a.faculty ? displayName(a.faculty) : "This faculty"} · ${formatDate(a.date)} ${formatRange(a.start_time, a.end_time)}. Students will no longer see this slot.`}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </>
  );
}
