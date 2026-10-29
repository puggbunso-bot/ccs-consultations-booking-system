"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Logo from "./Logo";
import { logoutAction } from "@/lib/actions";

export interface SideLink {
  href: string;
  label: string;
}

interface SidebarProps {
  user: {
    first_name: string;
    last_name: string;
    email: string;
    role: string;
  };
  links: SideLink[];
  unread: number;
  home: string;
}

/**
 * Left sidebar shown to every signed-in user (admin / faculty / student).
 *
 * Desktop: a fixed column — brand, the user's avatar card (click → profile),
 * the role-specific links, then the role badge + logout pinned at the bottom.
 * Mobile (≤960px): a slim top bar with a hamburger opens it as a slide-in
 * drawer (Escape / scrim / any link closes it).
 */
export default function Sidebar({ user, links, unread, home }: SidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the drawer on Escape; lock body scroll while it's open
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const initials = `${user.first_name[0] ?? ""}${user.last_name[0] ?? ""}`.toUpperCase();

  // Only the most specific link is active (e.g. /faculty/bookings highlights
  // "Booking Requests", not also its parent "My Schedule").
  const activeHref = links.reduce<string | null>(
    (best, l) =>
      pathname === l.href || pathname.startsWith(l.href + "/")
        ? best === null || l.href.length > best.length
          ? l.href
          : best
        : best,
    null,
  );
  const close = () => setOpen(false);

  return (
    <>
      {/* --- Mobile top bar (hidden on desktop) --- */}
      <header className="side-topbar">
        <button
          type="button"
          className="side-burger"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>
        <Link href={home} className="side-topbrand">
          <Logo size={24} />
          <span>CCS Consultation</span>
        </Link>
        <Link
          href="/profile"
          onClick={close}
          className={`side-avatar side-avatar-sm av-${user.role}`}
          title="My profile"
        >
          {initials}
        </Link>
      </header>

      {open && (
        <button
          type="button"
          className="side-scrim"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        />
      )}

      {/* --- Sidebar --- */}
      <aside className={`sidebar${open ? " open" : ""}`}>
        <Link href={home} className="side-brand">
          <Logo size={28} />
          <span>CCS Consultation</span>
        </Link>

        <Link href="/profile" onClick={close} className="side-user" title="My profile">
          <span className={`side-avatar av-${user.role}`}>{initials}</span>
          <span className="side-user-text">
            <b>
              {user.first_name} {user.last_name}
            </b>
            <small>{user.email}</small>
          </span>
        </Link>

        <nav className="side-links" aria-label="Main">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={close}
              className={`side-link${activeHref === l.href ? " active" : ""}`}
              aria-current={activeHref === l.href ? "page" : undefined}
            >
              <span>{l.label}</span>
              {l.href === "/notifications" && unread > 0 && (
                <span className="side-count">{unread > 99 ? "99+" : unread}</span>
              )}
            </Link>
          ))}
        </nav>

        <div className="side-foot">
          <span className={`role-badge role-${user.role}`}>{user.role}</span>
          <form action={logoutAction}>
            <button type="submit" className="btn side-logout">
              Logout
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
