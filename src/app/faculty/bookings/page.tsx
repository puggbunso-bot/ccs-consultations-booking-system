import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/supabase";
import { formatDate, formatRange, relativeTime, statusLabel } from "@/lib/format";
import { cancelBookingAction, decideBookingAction } from "@/lib/booking-actions";
import type { BookingWithPeople } from "@/lib/types";

/** Has this booking's scheduled time already passed? (kept outside render for purity) */
function isPast(b: BookingWithPeople): boolean {
  const [y, m, d] = b.date.split("-").map(Number);
  const [hh, mm] = b.end_time.split(":").map(Number);
  return Date.now() >= new Date(y, m - 1, d, hh, mm).getTime();
}

export default async function FacultyBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const user = await requireRole("faculty");
  const { error, ok } = await searchParams;

  const { data } = await db()
    .from("bookings")
    .select(
      `*,
       student:users!bookings_student_id_fkey(id, first_name, last_name, email),
       faculty:users!bookings_faculty_id_fkey(id, first_name, last_name, specialization, room),
       availability:availability(id, day, room)`,
    )
    .eq("faculty_id", user.id)
    .order("date", { ascending: false })
    .order("start_time", { ascending: false });

  const bookings = (data ?? []) as BookingWithPeople[];

  const pending = bookings.filter((b) => b.status === "pending" && !isPast(b));
  const rest = bookings.filter((b) => b.status !== "pending" && !isPast(b));
  const pastList = bookings.filter(isPast);

  const renderCard = (b: BookingWithPeople) => {
    const isPending = b.status === "pending";
    const canCancel =
      (b.status === "pending" || b.status === "approved") && !isPast(b);
    return (
      <div key={b.id} className={`booking-card st-${b.status}`}>
        <div className="booking-top">
          <div>
            <h3>{b.student ? `${b.student.first_name} ${b.student.last_name}` : "Student"}</h3>
            <p className="spec muted small" style={{ margin: "0.15rem 0 0" }}>
              📧 {b.student?.email ?? "—"}
            </p>
          </div>
          <span className={`pill pill-${b.status}`}>{statusLabel(b.status)}</span>
        </div>

        <div className="booking-when">
          <span>📅 {formatDate(b.date)}</span>
          <span>⏰ {formatRange(b.start_time, b.end_time)}</span>
          <span>📍 {b.availability?.room ?? user.room ?? "TBA"}</span>
          <span className="muted">Requested {relativeTime(b.created_at)}</span>
        </div>

        {b.note && <div className="booking-note">💬 {b.note}</div>}

        <div className="booking-actions">
          {isPending ? (
            <>
              <form action={decideBookingAction}>
                <input type="hidden" name="id" value={b.id} />
                <input type="hidden" name="decision" value="approved" />
                <button type="submit" className="btn btn-small btn-approve">
                  ✔ Approve
                </button>
              </form>
              <form action={decideBookingAction}>
                <input type="hidden" name="id" value={b.id} />
                <input type="hidden" name="decision" value="rejected" />
                <button type="submit" className="btn btn-small btn-danger">
                  ✕ Reject
                </button>
              </form>
            </>
          ) : (
            <Link href={`/bookings/${b.id}`} className="btn btn-small">
              {b.status === "approved" ? "Open chatbox →" : "View details →"}
            </Link>
          )}

          {canCancel && (
            <form action={cancelBookingAction}>
              <input type="hidden" name="id" value={b.id} />
              <input type="hidden" name="from" value="faculty" />
              <button type="submit" className="btn btn-small btn-outline">
                Cancel
              </button>
            </form>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="page-head">
        <h1>📨 Booking Requests</h1>
        <p>
          Students who want a consultation with you. Approve or reject each request.
        </p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {ok && <div className="alert alert-ok">{ok}</div>}

      {bookings.length === 0 ? (
        <div className="card">
          <p className="empty">No booking requests yet.</p>
          <div style={{ textAlign: "center" }}>
            <Link href="/faculty" className="btn">
              Set your availability →
            </Link>
          </div>
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <>
              <h2 className="section-title">
                ⏳ Waiting for approval ({pending.length})
              </h2>
              <div className="card-grid">{pending.map(renderCard)}</div>
            </>
          )}

          {rest.length > 0 && (
            <>
              <h2 className="section-title">Decided &amp; cancelled ({rest.length})</h2>
              <div className="card-grid">{rest.map(renderCard)}</div>
            </>
          )}

          {pastList.length > 0 && (
            <>
              <h2 className="section-title">Past consultations ({pastList.length})</h2>
              <div className="card-grid">{pastList.map(renderCard)}</div>
            </>
          )}
        </>
      )}
    </>
  );
}
