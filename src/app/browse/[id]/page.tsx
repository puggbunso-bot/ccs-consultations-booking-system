import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/supabase";
import { byWhen, displayName, todayYmd } from "@/lib/format";
import ScheduleByDate from "@/components/ScheduleByDate";
import type { AvailabilityRow, SessionUser } from "@/lib/types";

export default async function TeacherSchedulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole("admin", "faculty", "student");
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isFinite(id)) notFound();

  const { data: facultyData } = await db()
    .from("users")
    .select("*")
    .eq("id", id)
    .eq("role", "faculty")
    .eq("status", "active")
    .maybeSingle();

  const faculty = facultyData as SessionUser | null;
  if (!faculty) notFound();

  const { data: availData } = await db()
    .from("availability")
    .select("*")
    .eq("faculty_id", faculty.id)
    .gte("date", todayYmd());

  // Chronological — the dropdown lists them in this order.
  const rows = byWhen((availData ?? []) as AvailabilityRow[]);

  return (
    <>
      <div className="page-head">
        <Link href="/browse">← Back to faculty list</Link>
      </div>

      <div className="card">
        <div className="profile-head">
          <div className="avatar">{faculty.first_name[0]}</div>
          <div>
            <h1>{displayName(faculty)}</h1>
            <p className="spec">
              {faculty.specialization ?? "CCS Faculty"} · {faculty.room ?? "Room TBA"}
            </p>
          </div>
        </div>

        <h2 style={{ marginTop: "1.25rem" }}>🗓️ Available dates &amp; times</h2>

        <ScheduleByDate
          slots={rows.map((r) => ({
            id: r.id,
            date: r.date,
            start_time: r.start_time,
            end_time: r.end_time,
            room: r.room,
          }))}
          fallbackRoom={faculty.room}
          canBook={user.role === "student"}
        />

        {user.role === "student" && rows.length > 0 && (
          <p className="muted small" style={{ textAlign: "center", margin: "1rem 0 0" }}>
            Pick a date above to see the time your professor set. Booked slots are shown as
            disabled on the next page.
          </p>
        )}
      </div>
    </>
  );
}
