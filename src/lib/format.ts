import type { Day } from "./types";

/** Sort schedule rows chronologically (exact date), then by start time. */
export function byWhen<T extends { date: string; start_time: string }>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time),
  );
}

/** "09:00" → "9:00 AM" */
export function formatTime(t: string): string {
  const [hRaw, m] = t.split(":");
  const h = Number(hRaw);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${m} ${suffix}`;
}

/** "09:00 - 12:00" → "9:00 AM – 12:00 PM" */
export function formatRange(start: string, end: string): string {
  return `${formatTime(start)} – ${formatTime(end)}`;
}

/** "Prof. Juan Cruz" style display name with a role-based prefix. */
export function displayName(u: { first_name: string; last_name: string; role: string }): string {
  const prefix = u.role === "faculty" ? "Prof. " : u.role === "admin" ? "Admin " : "";
  return `${prefix}${u.first_name} ${u.last_name}`;
}

/** "pending" → "Pending" */
export function statusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

/** "2026-10-28" → "Oct 28, 2026" */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** "2h ago" / "in 3d" */
export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const abs = Math.abs(diff);
  const mins = Math.round(abs / 60000);
  const label =
    mins < 1
      ? "just now"
      : mins < 60
        ? `${mins}m`
        : mins < 1440
          ? `${Math.round(mins / 60)}h`
          : `${Math.round(mins / 1440)}d`;
  if (label === "just now") return label;
  return diff >= 0 ? `${label} ago` : `in ${label}`;
}

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

const DAY_NAMES: Day[] = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Today as 'YYYY-MM-DD' (local). */
export function todayYmd(): string {
  return ymd(new Date());
}

/** 'YYYY-MM-DD' → weekday name, parsed as LOCAL date (not UTC). */
export function weekdayOf(iso: string): Day {
  const [y, m, d] = iso.split("-").map(Number);
  return DAY_NAMES[new Date(y, m - 1, d).getDay()];
}
