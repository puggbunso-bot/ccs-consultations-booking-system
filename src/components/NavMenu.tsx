"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Responsive nav wrapper.
 *
 * Desktop : renders the children inline in the navbar (nav-links + nav-user).
 * Mobile  : shows a hamburger button that opens a dropdown drawer.
 *
 * The children are whatever the server-side <Nav /> passes in, so the
 * unread-count badge and the role badge stay server-rendered.
 */
export default function NavMenu({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Close when clicking/tapping outside the menu
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [open]);

  // Close as soon as a link is followed
  const close = () => setOpen(false);

  return (
    <div ref={wrapRef} className={`nav-menu${open ? " open" : ""}`}>
      <button
        type="button"
        className="nav-burger"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls="nav-drawer"
        onClick={() => setOpen((v) => !v)}
      >
        <span />
        <span />
        <span />
      </button>

      <div id="nav-drawer" className="nav-drawer" onClick={close}>
        {children}
      </div>
    </div>
  );
}
