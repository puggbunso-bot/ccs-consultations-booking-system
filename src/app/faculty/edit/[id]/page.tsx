import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/supabase";
import { updateAvailabilityAction } from "@/lib/actions";
import DateField from "@/components/DateField";
import type { AvailabilityRow } from "@/lib/types";

export default async function EditAvailabilityPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireRole("faculty");
  const { id: idParam } = await params;
  const { error } = await searchParams;
  const id = Number(idParam);

  if (!Number.isFinite(id)) redirect("/faculty");

  const { data } = await db().from("availability").select("*").eq("id", id).maybeSingle();
  const row = data as AvailabilityRow | null;

  // Ownership check — only the owner may edit
  if (!row || row.faculty_id !== user.id) redirect("/faculty");

  const initialDate = row.date;

  return (
    <>
      <div className="page-head">
        <h1>Edit availability</h1>
        <p>
          Changing this updates what students see.{" "}
          <Link href="/faculty">← Back to my schedule</Link>
        </p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card" style={{ maxWidth: 460 }}>
        <form action={updateAvailabilityAction} className="form-grid">
          <input type="hidden" name="id" value={row.id} />

          <div>
            <DateField defaultValue={initialDate} />
          </div>

          <div className="form-row">
            <div>
              <label htmlFor="start_time">Start time</label>
              <input
                id="start_time"
                name="start_time"
                type="time"
                required
                defaultValue={row.start_time}
              />
            </div>
            <div>
              <label htmlFor="end_time">End time</label>
              <input
                id="end_time"
                name="end_time"
                type="time"
                required
                defaultValue={row.end_time}
              />
            </div>
          </div>

          <div>
            <label htmlFor="room">Room / location</label>
            <input
              id="room"
              name="room"
              type="text"
              defaultValue={row.room ?? ""}
              placeholder="Room 305 / Online"
            />
          </div>

          <div style={{ display: "flex", gap: "0.6rem" }}>
            <button type="submit" className="btn">
              Save changes
            </button>
            <Link href="/faculty" className="btn btn-danger">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </>
  );
}
