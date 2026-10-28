import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/supabase";
import { addAvailabilityAction, deleteAvailabilityAction } from "@/lib/actions";
import { byWhen, formatDate, formatRange, weekdayOf } from "@/lib/format";
import ConfirmDelete from "@/components/ConfirmDelete";
import DateField from "@/components/DateField";
import type { AvailabilityRow } from "@/lib/types";

export default async function FacultySchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const user = await requireRole("faculty");
  const { error, ok } = await searchParams;

  const { data } = await db()
    .from("availability")
    .select("*")
    .eq("faculty_id", user.id);

  const rows = byWhen((data ?? []) as AvailabilityRow[]);

  return (
    <>
      <div className="page-head">
        <h1>My Consultation Schedule</h1>
        <p>
          Set the exact <strong>date</strong>, time and room you are free. Students can
          only book what you set here.
        </p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {ok && <div className="alert alert-ok">{ok}</div>}

      <div className="grid-2">
        {/* ---------------- Add form ---------------- */}
        <div className="card">
          <h2>➕ Add availability</h2>
          <form action={addAvailabilityAction} className="form-grid">
            <div>
              <DateField />
            </div>

            <div className="form-row">
              <div>
                <label htmlFor="start_time">Start time</label>
                <input id="start_time" name="start_time" type="time" required />
              </div>
              <div>
                <label htmlFor="end_time">End time</label>
                <input id="end_time" name="end_time" type="time" required />
              </div>
            </div>

            <div>
              <label htmlFor="room">Room / location (optional)</label>
              <input
                id="room"
                name="room"
                type="text"
                placeholder={user.room ?? "Room 305 / Online"}
                defaultValue={user.room ?? ""}
              />
            </div>

            <button type="submit" className="btn btn-block">
              Add to schedule
            </button>
          </form>
        </div>

        {/* ---------------- Current schedule ---------------- */}
        <div className="card">
          <h2>📅 My schedule ({rows.length})</h2>

          {rows.length === 0 ? (
            <p className="empty">
              No availability set yet. Add your first slot on the left →
            </p>
          ) : (
            <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Day</th>
                  <th>Time</th>
                  <th>Room</th>
                  <th className="right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="sched-date">{formatDate(r.date)}</td>
                    <td className="sched-day">{weekdayOf(r.date)}</td>
                    <td className="sched-time">{formatRange(r.start_time, r.end_time)}</td>
                    <td>{r.room ?? "—"}</td>
                    <td>
                      <div className="actions">
                        <Link href={`/faculty/edit/${r.id}`} className="btn btn-small">
                          Edit
                        </Link>
                        <ConfirmDelete
                          action={deleteAvailabilityAction}
                          fields={[{ name: "id", value: r.id }]}
                          title="Delete this schedule?"
                          message={`${formatDate(r.date)} · ${formatRange(r.start_time, r.end_time)}${r.room ? ` · ${r.room}` : ""}. Students will no longer see this slot.`}
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
      </div>
    </>
  );
}
