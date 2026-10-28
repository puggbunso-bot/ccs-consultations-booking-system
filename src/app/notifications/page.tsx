import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/supabase";
import { relativeTime } from "@/lib/format";
import { markAllReadAction, markNotificationReadAction } from "@/lib/booking-actions";
import type { NotificationRow } from "@/lib/types";

const ICONS: Record<string, string> = {
  booking_requested: "📩",
  booking_approved: "✅",
  booking_rejected: "❌",
  booking_cancelled: "🚫",
  new_link: "🔗",
};

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const user = await requireRole("student", "faculty", "admin");
  const { error, ok } = await searchParams;

  const { data } = await db()
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const items = (data ?? []) as NotificationRow[];
  const unread = items.filter((n) => !n.is_read).length;

  return (
    <>
      <div className="page-head">
        <h1>🔔 Notifications</h1>
        <p>
          {unread > 0
            ? `You have ${unread} unread notification${unread === 1 ? "" : "s"}.`
            : "You are all caught up."}
        </p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {ok && <div className="alert alert-ok">{ok}</div>}

      {items.length === 0 ? (
        <div className="card">
          <p className="empty">No notifications yet.</p>
        </div>
      ) : (
        <>
          {unread > 0 && (
            <div style={{ marginBottom: "1rem" }}>
              <form action={markAllReadAction}>
                <button type="submit" className="btn btn-small btn-outline">
                  Mark all as read
                </button>
              </form>
            </div>
          )}

          <div className="notif-list">
            {items.map((n) => (
              <div key={n.id} className={`notif ${n.is_read ? "read" : "unread"}`}>
                <span className="notif-dot" aria-hidden="true" />
                <div className="notif-body">
                  <h4>
                    {ICONS[n.type] ?? "🔔"} {n.title}
                  </h4>
                  <p>{n.body}</p>
                  <div className="notif-meta">
                    <span>{relativeTime(n.created_at)}</span>
                    {n.link && <Link href={n.link}>View →</Link>}
                    {!n.is_read && (
                      <form action={markNotificationReadAction}>
                        <input type="hidden" name="id" value={n.id} />
                        <button type="submit" className="btn btn-small btn-outline">
                          Mark read
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
