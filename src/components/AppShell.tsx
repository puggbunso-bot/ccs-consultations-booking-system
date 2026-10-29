import type { ReactNode } from "react";
import Link from "next/link";
import Logo from "./Logo";
import NavMenu from "./NavMenu";
import Sidebar from "./Sidebar";
import { getSession, homeFor } from "@/lib/auth";
import { db } from "@/lib/supabase";

/** Role-specific main links — one column each in the sidebar. */
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

/**
 * Chooses the chrome around every page:
 *   • signed out  → the slim public navbar (brand + Sign in / Register)
 *   • signed in   → the left <Sidebar /> (all 3 roles) with the page content
 *                   shifted to its right
 */
export default async function AppShell({ children }: { children: ReactNode }) {
  const user = await getSession();

  // ---------------- Public chrome (not logged in) ----------------
  if (!user) {
    return (
      <>
        <header className="nav nav-public">
          <div className="nav-inner">
            <Link href="/" className="nav-brand">
              <Logo size={30} />
              <span>CCS Consultation Schedule</span>
            </Link>
            <NavMenu>
              <div className="nav-user">
                <Link href="/login" className="btn btn-ghost btn-small">
                  Sign in
                </Link>
                <Link href="/register" className="btn btn-small">
                  Register
                </Link>
              </div>
            </NavMenu>
          </div>
        </header>
        <main className="container">{children}</main>
      </>
    );
  }

  // ---------------- Signed-in chrome (sidebar) ----------------
  let unread = 0;
  const { count } = await db()
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_read", false);
  unread = count ?? 0;

  return (
    <div className="app">
      <Sidebar
        user={{
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          role: user.role,
        }}
        links={NAV[user.role] ?? []}
        unread={unread}
        home={homeFor(user.role)}
      />
      <main className="container app-main">{children}</main>
    </div>
  );
}
