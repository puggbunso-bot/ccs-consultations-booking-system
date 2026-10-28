import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/supabase";
import { displayName, formatDate, formatRange, statusLabel } from "@/lib/format";
import { cancelBookingAction } from "@/lib/booking-actions";
import type { BookingWithPeople } from "@/lib/types";

/** Has this booking's scheduled time already passed? (kept outside render for purity) */
function isPast(b: BookingWithPeople): boolean {
  const [y, m, d] = b.date.split("-").map(Number);
  const [hh, mm] = b.end_time.split(":").map(Number);
  return Date.now() >= new Date(y, m - 1, d, hh, mm).getTime();
}

export default async function MyBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const user = await requireRole("student");
  const { error, ok } = await searchParams;

  const { data } = await db()
    .from("bookings")
    .select(
      `*,
       student:users!bookings_student_id_fkey(id, first_name, last_name, email),
       faculty:users!bookings_faculty_id_fkey(id, first_name, last_name, specialization, room),
       availability:availability(id, day, room)`,
    )
    .eq("student_id", user.id)
    .order("date", { ascending: false })
    .order("start_time", { ascending: false });

  const bookings = (data ?? []) as BookingWithPeople[];

  const active = (b: BookingWithPeople) => b.status === "approved" || b.status === "pending";
  const upcoming = bookings.filter((b) => active(b) && !isPast(b));
  const past = bookings.filter((b) => !active(b) || isPast(b));

  const renderCard = (b: BookingWithPeople) => {
    const canCancel =
      (b.status === "pending" || b.status === "approved") && !isPast(b);
    return (
      <div key={b.id} className={`booking-card st-${b.status}`}>
        <div className="booking-top">
          <div>
            <h3>
              {b.faculty ? displayName({ ...b.faculty, role: "faculty" }) : "Faculty"}
            </h3>
            <p className="spec muted small" style={{ margin: "0.15rem 0 0" }}>
              {b.faculty?.specialization ?? "CCS Faculty"}
            </p>
          </div>
          <span className={`pill pill-${b.status}`}>{statusLabel(b.status)}</span>
        </div>

        <div className="booking-when">
          <span>📅 {formatDate(b.date)}</span>
          <span>⏰ {formatRange(b.start_time, b.end_time)}</span>
          <span>📍 {b.availability?.room ?? b.faculty?.room ?? "TBA"}</span>
        </div>

        {b.note && <div className="booking-note">💬 {b.note}</div>}

        <div className="booking-actions">
          <Link href={`/bookings/${b.id}`} className="btn btn-small">
            {b.status === "approved" ? "Open chatbox →" : "View details →"}
          </Link>
          {canCancel && (
            <form action={cancelBookingAction}>
              <input type="hidden" name="id" value={b.id} />
              <input type="hidden" name="from" value="student" />
              <button type="submit" className="btn btn-small btn-danger">
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
        <h1>🎫 My Bookings</h1>
        <p>Your consultation requests and their approval status.</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {ok && <div className="alert alert-ok">{ok}</div>}

      {bookings.length === 0 ? (
        <div className="card">
          <p className="empty">You have not booked any consultation yet.</p>
          <div style={{ textAlign: "center" }}>
            <Link href="/browse" className="btn">
              Browse faculty →
            </Link>
          </div>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <>
              <h2 className="section-title">Upcoming &amp; pending ({upcoming.length})</h2>
              <div className="card-grid">{upcoming.map(renderCard)}</div>
            </>
          )}

          {past.length > 0 && (
            <>
              <h2 className="section-title">Past &amp; cancelled ({past.length})</h2>
              <div className="card-grid">{past.map(renderCard)}</div>
            </>
          )}
        </>
      )}
    </>
  );
}
