import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/supabase";
import { displayName, formatDate, formatRange, statusLabel } from "@/lib/format";
import { cancelBookingAction, sendMessageAction } from "@/lib/booking-actions";
import type { BookingStatus, MessageWithSender, SessionUser } from "@/lib/types";

function chatUnlocksAt(date: string, startTime: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = startTime.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm);
}

/**
 * Has the scheduled start time already arrived?
 * Kept outside the component so render stays pure (react-hooks/purity).
 */
function timeReached(date: string, startTime: string): boolean {
  return Date.now() >= chatUnlocksAt(date, startTime).getTime();
}

export default async function BookingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const user = await requireRole("student", "faculty");
  const { id: idParam } = await params;
  const { error, ok } = await searchParams;
  const id = Number(idParam);
  if (!Number.isFinite(id)) notFound();

  const { data } = await db()
    .from("bookings")
    .select(
      `*,
       student:users!bookings_student_id_fkey(id, first_name, last_name, email, role),
       faculty:users!bookings_faculty_id_fkey(id, first_name, last_name, specialization, room, role),
       availability:availability(id, day, room)`,
    )
    .eq("id", id)
    .maybeSingle();

  const booking = data as
    | (Awaited<typeof data> & {
        student: SessionUser | null;
        faculty: SessionUser | null;
      })
    | null;

  if (!booking) notFound();

  // Only the 2 booked parties may view this page
  if (booking.student_id !== user.id && booking.faculty_id !== user.id) {
    notFound();
  }

  const isStudent = user.id === booking.student_id;
  const other = isStudent ? booking.faculty : booking.student;

  // ---- chatbox gate -------------------------------------------------------
  const isApproved = booking.status === "approved";
  const timeReachedNow = timeReached(booking.date, booking.start_time);
  const chatOpen = isApproved && timeReachedNow;

  // ---- messages -----------------------------------------------------------
  let messages: MessageWithSender[] = [];
  if (isApproved) {
    const { data: msgs } = await db()
      .from("messages")
      .select("*, sender:users!messages_sender_id_fkey(id, first_name, last_name, role)")
      .eq("booking_id", id)
      .order("created_at", { ascending: true });
    messages = (msgs ?? []) as MessageWithSender[];
  }

  const fmtStatus = statusLabel(booking.status as BookingStatus);

  return (
    <>
      <div className="page-head">
        <Link href={isStudent ? "/bookings" : "/faculty/bookings"}>
          ← Back to {isStudent ? "my bookings" : "booking requests"}
        </Link>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {ok && <div className="alert alert-ok">{ok}</div>}

      <div className="detail-grid">
        {/* ---------------- Details ---------------- */}
        <div className="card">
          <div className="booking-top">
            <h2 style={{ margin: 0 }}>Booking #{booking.id}</h2>
            <span className={`pill pill-${booking.status}`}>{fmtStatus}</span>
          </div>

          <dl className="kv" style={{ marginTop: "1rem" }}>
            <dt>Student</dt>
            <dd>
              {booking.student
                ? `${booking.student.first_name} ${booking.student.last_name}`
                : "—"}
              <br />
              <span className="muted small">{booking.student?.email}</span>
            </dd>

            <dt>Faculty</dt>
            <dd>{booking.faculty ? displayName({ ...booking.faculty, role: "faculty" }) : "—"}</dd>

            <dt>Date</dt>
            <dd>
              {formatDate(booking.date)} ({booking.availability?.day ?? "—"})
            </dd>

            <dt>Time</dt>
            <dd>{formatRange(booking.start_time, booking.end_time)}</dd>

            <dt>Location</dt>
            <dd>{booking.availability?.room ?? booking.faculty?.room ?? "TBA"}</dd>

            <dt>Status</dt>
            <dd>{fmtStatus}</dd>

            {booking.note && (
              <>
                <dt>Reason</dt>
                <dd>{booking.note}</dd>
              </>
            )}
          </dl>

          {booking.status === "pending" && (
            <p className="muted small mt-2">
              ⏳ Waiting for {booking.faculty ? displayName({ ...booking.faculty, role: "faculty" }) : "the faculty"} to
              approve this request.
            </p>
          )}
        </div>

        {/* ---------------- Chatbox ---------------- */}
        <div>
          <div className="chat">
            <div className="chat-head">
              💬 Chatbox
              <span className={`pill pill-${isApproved ? "approved" : "pending"}`}>
                {isApproved ? (chatOpen ? "Open" : "Locked") : "Unavailable"}
              </span>
            </div>

            {!isApproved ? (
              <div className="chat-locked">
                The chatbox opens only once this booking is <strong>approved</strong>.
              </div>
            ) : !timeReachedNow ? (
              <div className="chat-locked">
                🔒 Opens at the scheduled time — <strong>{formatDate(booking.date)}{" "}
                {formatRange(booking.start_time, booking.end_time)}</strong>
              </div>
            ) : (
              <>
                <div className="chat-msgs">
                  {messages.length === 0 ? (
                    <p className="chat-empty">
                      No link yet.{" "}
                      {isStudent
                        ? `Waiting for ${other ? displayName({ ...other, role: "faculty" }) : "your faculty"} to share the online meeting link.`
                        : "Share the online meeting link with your student."}
                    </p>
                  ) : (
                    messages.map((m) => {
                      const mine = m.sender_id === user.id;
                      return (
                        <div key={m.id} className={`msg ${mine ? "mine" : "theirs"}`}>
                          <span className="msg-who">
                            {mine ? "You" : m.sender ? displayName(m.sender) : "—"}
                          </span>
                          <a href={m.body} target="_blank" rel="noopener noreferrer">
                            {m.body}
                          </a>
                          <span className="msg-time">
                            {new Date(m.created_at).toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>

                <form action={sendMessageAction} className="chat-form">
                  <input type="hidden" name="booking_id" value={booking.id} />
                  <input
                    type="url"
                    name="body"
                    required
                    placeholder="https://meet.google.com/…"
                    aria-label="Online meeting link"
                  />
                  <button type="submit" className="btn">
                    Send
                  </button>
                </form>
                <div className="chat-locked" style={{ borderTop: "none", background: "#f8fafc" }}>
                  🔗 Online meeting links only (Google Meet, Zoom, etc.)
                </div>
              </>
            )}
          </div>

          {(booking.status === "approved" || booking.status === "pending") && (
            <div style={{ marginTop: "1rem" }}>
              <form action={cancelBookingAction}>
                <input type="hidden" name="id" value={booking.id} />
                <input type="hidden" name="from" value={isStudent ? "student" : "faculty"} />
                <button type="submit" className="btn btn-danger btn-block">
                  Cancel this booking
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
