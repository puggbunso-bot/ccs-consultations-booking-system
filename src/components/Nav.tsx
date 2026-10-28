import Link from "next/link";
import Logo from "./Logo";
import { getSession, homeFor } from "@/lib/auth";
import { logoutAction } from "@/lib/actions";
import { db } from "@/lib/supabase";
import { displayName } from "@/lib/format";

const NAV: Record<string, { href: string; label: string }[]> = {
  admin: [
    { href: "/admin", label: "🛡️ Manage Users" },
    { href: "/browse", label: "👨‍🏫 Faculty List" },
    { href: "/notifications", label: "🔔 Notifications" },
  ],
  faculty: [
    { href: "/faculty", label: "📅 My Schedule" },
    { href: "/faculty/bookings", label: "📨 Booking Requests" },
    { href: "/notifications", label: "🔔 Notifications" },
  ],
  student: [
    { href: "/browse", label: "👨‍🏫 Faculty List" },
    { href: "/bookings", label: "🎫 My Bookings" },
    { href: "/notifications", label: "🔔 Notifications" },
  ],
};

export default async function Nav() {
  const user = await getSession();

  // Unread in-app notification count (bell badge)
  let unread = 0;
  if (user) {
    const { count } = await db()
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
    unread = count ?? 0;
  }

  // ---------------- Public nav (not logged in) ----------------
  if (!user) {
    return (
      <header className="nav nav-public">
        <div className="nav-inner">
          <Link href="/" className="nav-brand">
            <Logo size={30} />
            <span>CCS Consultation Schedule</span>
          </Link>
          <div className="nav-user">
            <Link href="/login" className="btn btn-ghost btn-small">
              Sign in
            </Link>
            <Link href="/register" className="btn btn-small">
              Register
            </Link>
          </div>
        </div>
      </header>
    );
  }

  // ---------------- Logged-in nav ----------------
  const links = NAV[user.role] ?? [];

  return (
    <header className="nav">
      <div className="nav-inner">
        <Link href={homeFor(user.role)} className="nav-brand">
          <Logo size={30} />
          <span>CCS Consultation Schedule</span>
        </Link>

        <nav className="nav-links">
          {links.map((l) => (
            <Link key={l.href} href={l.href}>
              {l.href === "/notifications" && unread > 0 ? (
                <span className="bell">
                  {l.label}
                  <span className="bell-count">{unread > 99 ? "99+" : unread}</span>
                </span>
              ) : (
                l.label
              )}
            </Link>
          ))}
        </nav>

        <div className="nav-user">
          <span className="nav-name">
            {displayName(user)}
            <span className={`role-badge role-${user.role}`}>{user.role}</span>
          </span>
          <form action={logoutAction}>
            <button type="submit" className="btn btn-ghost btn-small">
              Logout
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
