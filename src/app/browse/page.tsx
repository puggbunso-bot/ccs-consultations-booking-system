import { requireRole } from "@/lib/auth";
import { db } from "@/lib/supabase";
import FacultySearch from "@/components/FacultySearch";
import type { SessionUser } from "@/lib/types";

export default async function BrowseFacultyPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  await requireRole("admin", "faculty", "student");
  const { error, ok } = await searchParams;

  const { data } = await db()
    .from("users")
    .select("*")
    .eq("role", "faculty")
    .eq("status", "active")
    .order("last_name");

  const faculty = (data ?? []) as SessionUser[];

  return (
    <>
      <div className="page-head">
        <h1>CCS Faculty</h1>
        <p>Select a teacher to see their available days and times.</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {ok && <div className="alert alert-ok">{ok}</div>}

      <FacultySearch faculty={faculty} />
    </>
  );
}
