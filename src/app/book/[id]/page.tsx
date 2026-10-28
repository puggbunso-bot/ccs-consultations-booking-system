import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/supabase";
import { displayName, formatDate, formatRange } from "@/lib/format";
import BookingForm from "@/components/BookingForm";
import type { AvailabilityRow, SessionUser } from "@/lib/types";

export default async function BookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole("student");
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isFinite(id)) notFound();

  const { data: availData } = await db()
    .from("availability")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  const avail = availData as AvailabilityRow | null;
  if (!avail) notFound();

  const { data: facultyData } = await db()
    .from("users")
    .select("*")
    .eq("id", avail.faculty_id)
    .eq("role", "faculty")
    .eq("status", "active")
    .maybeSingle();

  const faculty = facultyData as SessionUser | null;
  if (!faculty) notFound();

  // Every active (pending/approved) booking for this faculty — used to grey out slots.
  const { data: bookedData } = await db()
    .from("bookings")
    .select("date, start_time, end_time")
    .eq("faculty_id", faculty.id)
    .in("status", ["pending", "approved"])
    .gte("date", new Date().toISOString().slice(0, 10));

  const booked = (bookedData ?? []) as { date: string; start_time: string; end_time: string }[];

  return (
    <>
      <div className="page-head">
        <Link href={`/browse/${faculty.id}`}>← Back to {displayName(faculty)}</Link>
      </div>

      <div className="card">
        <div className="profile-head">
          <div className="avatar">{faculty.first_name[0]}</div>
          <div>
            <h1>Book a consultation</h1>
            <p className="spec">
              {displayName(faculty)} ·{" "}
              {formatDate(avail.date)} · {formatRange(avail.start_time, avail.end_time)}
            </p>
          </div>
        </div>

        <div className="booking-summary" style={{ marginTop: "1.1rem" }}>
          <div>
            <span className="muted small">Available on</span>
            <strong>{formatDate(avail.date)}</strong>
          </div>
          <div>
            <span className="muted small">Hours</span>
            <strong>{formatRange(avail.start_time, avail.end_time)}</strong>
          </div>
          <div>
            <span className="muted small">Location</span>
            <strong>{avail.room ?? faculty.room ?? "TBA"}</strong>
          </div>
        </div>

        <div style={{ marginTop: "1.25rem" }}>
          <BookingForm
            availabilityId={avail.id}
            facultyName={displayName(faculty)}
            day={avail.day}
            date={avail.date}
            windowStart={avail.start_time}
            windowEnd={avail.end_time}
            room={avail.room ?? faculty.room}
            booked={booked}
          />
        </div>
      </div>

      <p className="muted small mt-2" style={{ textAlign: "center" }}>
        Signed in as <strong>{user.first_name} {user.last_name}</strong> (student)
      </p>
    </>
  );
}
