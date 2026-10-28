"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "./supabase";
import { getSession } from "./auth";
import { formatDate } from "./format";
import type { NotificationType } from "./types";

const TIME_RE = /^\d{2}:\d{2}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MIN_SLOT = 30; // minutes — bookings grow in 30-min steps

function go(path: string, key: "error" | "ok", message: string): never {
  redirect(`${path}?${key}=${encodeURIComponent(message)}`);
}

function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/** 'YYYY-MM-DD' -> local Date at that day's 00:00 */
function startOfDay(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// ---------------------------------------------------------------------------
// Notifications helper (in-app only — no email)
// ---------------------------------------------------------------------------
async function notify(
  userId: number,
  type: NotificationType,
  title: string,
  body: string,
  link: string | null,
): Promise<void> {
  await db()
    .from("notifications")
    .insert({ user_id: userId, type, title, body, link })
    .select("id")
    .maybeSingle();
}

/**
 * Notify every ACTIVE admin about booking activity, so the admin can follow
 * what is being booked. `exceptId` skips the acting user (never notifies self).
 */
async function notifyAdmins(
  type: NotificationType,
  title: string,
  body: string,
  link: string | null,
  exceptId?: number,
): Promise<void> {
  const { data: admins } = await db()
    .from("users")
    .select("id")
    .eq("role", "admin")
    .eq("status", "active");

  const rows = (admins ?? [])
    .map((a) => a.id)
    .filter((id) => id !== exceptId)
    .map((user_id) => ({ user_id, type, title, body, link }));

  if (rows.length === 0) return;
  await db().from("notifications").insert(rows);
}

// ---------------------------------------------------------------------------
// B1 — Student: create a booking (specific date + time slot)
// ---------------------------------------------------------------------------
export async function createBookingAction(formData: FormData): Promise<void> {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role !== "student") {
    go("/browse", "error", "Only students can book a consultation.");
  }

  const availabilityId = Number(formData.get("availability_id"));
  const date = String(formData.get("date") ?? "");
  const start = String(formData.get("start_time") ?? "");
  const end = String(formData.get("end_time") ?? "");
  const note = String(formData.get("note") ?? "").trim() || null;

  // Errors send the student back to the booking form they came from.
  const back = Number.isFinite(availabilityId) ? `/book/${availabilityId}` : "/browse";

  if (!Number.isFinite(availabilityId)) go("/browse", "error", "Invalid schedule entry.");
  if (!DATE_RE.test(date)) go(back, "error", "Please choose a valid date.");
  if (!TIME_RE.test(start) || !TIME_RE.test(end)) {
    go(back, "error", "Please choose a valid time slot.");
  }

  // --- the availability row must exist and belong to an active faculty ---
  const { data: avail } = await db()
    .from("availability")
    .select("id, faculty_id, day, date, start_time, end_time, room")
    .eq("id", availabilityId)
    .maybeSingle();

  if (!avail) go(back, "error", "That schedule entry no longer exists.");

  const { data: faculty } = await db()
    .from("users")
    .select("id, first_name, last_name, status")
    .eq("id", avail.faculty_id)
    .eq("role", "faculty")
    .eq("status", "active")
    .maybeSingle();

  if (!faculty) go(back, "error", "That faculty member is no longer available.");

  // --- date must be EXACTLY what the faculty set ---
  const today = startOfDay(new Date().toISOString().slice(0, 10));
  const chosen = startOfDay(date);

  if (chosen.getTime() < today.getTime()) {
    go(back, "error", "That date is already in the past.");
  }
  if (date !== avail.date) {
    go(
      back,
      "error",
      `${faculty.first_name} ${faculty.last_name} is only available on ${formatDate(avail.date)}.`,
    );
  }

  // --- slot must sit inside the availability window ---
  const s = toMinutes(start);
  const e = toMinutes(end);
  const winS = toMinutes(avail.start_time);
  const winE = toMinutes(avail.end_time);

  if (e <= s) go(back, "error", "End time must be after the start time.");
  if (s < winS || e > winE) {
    go(back, "error", "That slot is outside the faculty member's available hours.");
  }
  // Any 30-minute multiple that fits the window: 30 min, 1 hr, 2 hrs, 3 hrs… up to the whole slot.
  if (e - s < MIN_SLOT || (e - s) % MIN_SLOT !== 0) {
    go(
      back,
      "error",
      `Please pick at least ${MIN_SLOT} minutes in ${MIN_SLOT}-minute steps (30 min, 1 hr, 2 hrs…).`,
    );
  }

  // --- NO DOUBLE BOOKING: block if an active booking overlaps this slot ---
  const { data: clash } = await db()
    .from("bookings")
    .select("id, start_time, end_time, status")
    .eq("faculty_id", avail.faculty_id)
    .eq("date", date)
    .in("status", ["pending", "approved"])
    .lt("start_time", end) // existing starts before ours ends
    .gt("end_time", start) // existing ends after ours starts
    .limit(1)
    .maybeSingle();

  if (clash) {
    go(
      back,
      "error",
      `That time slot is already ${clash.status === "approved" ? "booked" : "reserved"} (${clash.start_time}–${clash.end_time}). Please pick another.`,
    );
  }

  const { data: created, error } = await db()
    .from("bookings")
    .insert({
      student_id: user.id,
      faculty_id: avail.faculty_id,
      availability_id: avail.id,
      date,
      start_time: start,
      end_time: end,
      note,
      status: "pending",
    })
    .select("id")
    .single();

  if (error || !created) {
    go(back, "error", `Could not create booking: ${error?.message ?? "unknown error"}`);
  }

  await notify(
    avail.faculty_id,
    "booking_requested",
    "New consultation request",
    `${user.first_name} ${user.last_name} wants a consultation on ${formatDate(date)} at ${start}–${end}.`,
    `/faculty/bookings`,
  );

  // Keep the admin in the loop.
  await notifyAdmins(
    "booking_requested",
    "New consultation request",
    `${user.first_name} ${user.last_name} booked ${formatDate(date)} ${start}–${end} with ${faculty.first_name} ${faculty.last_name}.`,
    `/admin`,
    user.id,
  );

  const id = (created as { id: number }).id;
  redirect(
    `/bookings?ok=${encodeURIComponent(
      `Booking requested for ${start}–${end} — waiting for faculty approval.`,
    )}&id=${id}`,
  );
}

// ---------------------------------------------------------------------------
// B2 — Faculty: approve / reject a booking
// ---------------------------------------------------------------------------
export async function decideBookingAction(formData: FormData): Promise<void> {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role !== "faculty") redirect("/login");

  const id = Number(formData.get("id"));
  const decision = String(formData.get("decision") ?? "");
  if (!Number.isFinite(id)) go("/faculty/bookings", "error", "Invalid booking.");
  if (decision !== "approved" && decision !== "rejected") {
    go("/faculty/bookings", "error", "Invalid decision.");
  }

  const { data: booking } = await db()
    .from("bookings")
    .select("id, faculty_id, student_id, status, date, start_time, end_time")
    .eq("id", id)
    .maybeSingle();

  if (!booking) go("/faculty/bookings", "error", "Booking not found.");
  if (booking.faculty_id !== user.id) {
    go("/faculty/bookings", "error", "This booking is not yours.");
  }
  if (booking.status !== "pending") {
    go("/faculty/bookings", "error", `This booking is already ${booking.status}.`);
  }

  // The scheduled time must not have passed yet.
  {
    const [y, m, d] = booking.date.split("-").map(Number);
    const [hh, mm] = booking.start_time.split(":").map(Number);
    if (Date.now() >= new Date(y, m - 1, d, hh, mm).getTime()) {
      go("/faculty/bookings", "error", "This consultation time has already passed.");
    }
  }

  // ACCEPT RULES (faculty free-time schedule):
  //   1. Inside one of the faculty's current free windows → OK (e.g. free 10:00–13:00, booked 10:30).
  //   2. Overlaps an already-approved booking → refused.
  if (decision === "approved") {
    const { data: windowRows } = await db()
      .from("availability")
      .select("start_time, end_time")
      .eq("faculty_id", user.id)
      .eq("date", booking.date);

    const insideWindow = (windowRows ?? []).some(
      (w) => booking.start_time >= w.start_time && booking.end_time <= w.end_time,
    );
    if (!insideWindow) {
      go(
        "/faculty/bookings",
        "error",
        "That request is outside your free schedule — adjust your availability first, or decline it.",
      );
    }

    const { data: conflicts } = await db()
      .from("bookings")
      .select("id, start_time, end_time")
      .eq("faculty_id", user.id)
      .eq("date", booking.date)
      .eq("status", "approved")
      .neq("id", booking.id);

    const clash = (conflicts ?? []).some(
      (c) => booking.start_time < c.end_time && c.start_time < booking.end_time,
    );
    if (clash) {
      go(
        "/faculty/bookings",
        "error",
        `That time is already booked (${booking.start_time}–${booking.end_time} overlaps another approved consultation).`,
      );
    }
  }

  const { error } = await db()
    .from("bookings")
    .update({ status: decision, decided_at: new Date().toISOString() })
    .eq("id", id);

  if (error) go("/faculty/bookings", "error", `Could not update: ${error.message}`);

  const verb = decision === "approved" ? "approved" : "declined";
  await notify(
    booking.student_id,
    decision === "approved" ? "booking_approved" : "booking_rejected",
    decision === "approved" ? "Consultation approved" : "Consultation declined",
    `${user.first_name} ${user.last_name} ${verb} your request for ${booking.date} at ${booking.start_time}–${booking.end_time}.`,
    `/bookings/${id}`,
  );

  // Keep the admin in the loop.
  await notifyAdmins(
    decision === "approved" ? "booking_approved" : "booking_rejected",
    decision === "approved" ? "Consultation approved" : "Consultation declined",
    `${user.first_name} ${user.last_name} ${verb} the ${booking.date} ${booking.start_time}–${booking.end_time} consultation.`,
    `/admin`,
    user.id,
  );

  go("/faculty/bookings", "ok", `Booking ${verb}.`);
}

// ---------------------------------------------------------------------------
// B3 — Cancel a booking (student cancels own · faculty cancels their own)
// ---------------------------------------------------------------------------
export async function cancelBookingAction(formData: FormData): Promise<void> {
  const user = await getSession();
  if (!user) redirect("/login");

  const id = Number(formData.get("id"));
  const from = String(formData.get("from") ?? "");
  const back = from === "faculty" ? "/faculty/bookings" : "/bookings";
  if (!Number.isFinite(id)) go(back, "error", "Invalid booking.");

  const { data: booking } = await db()
    .from("bookings")
    .select("id, student_id, faculty_id, status, date, start_time, end_time")
    .eq("id", id)
    .maybeSingle();

  if (!booking) go(back, "error", "Booking not found.");
  if (booking.student_id !== user.id && booking.faculty_id !== user.id) {
    go(back, "error", "You cannot cancel this booking.");
  }
  if (booking.status === "cancelled") go(back, "error", "This booking is already cancelled.");
  if (booking.status === "rejected") go(back, "error", "A declined booking cannot be cancelled.");

  // A consultation whose time has already passed can no longer be cancelled.
  {
    const [y, m, d] = booking.date.split("-").map(Number);
    const [hh, mm] = booking.end_time.split(":").map(Number);
    if (Date.now() >= new Date(y, m - 1, d, hh, mm).getTime()) {
      go(back, "error", "This consultation has already taken place — it cannot be cancelled.");
    }
  }

  const { error } = await db()
    .from("bookings")
    .update({ status: "cancelled", decided_at: new Date().toISOString() })
    .eq("id", id);

  if (error) go(back, "error", `Could not cancel: ${error.message}`);

  // Tell the OTHER side
  const otherId = user.id === booking.student_id ? booking.faculty_id : booking.student_id;
  await notify(
    otherId,
    "booking_cancelled",
    "Consultation cancelled",
    `${user.first_name} ${user.last_name} cancelled the ${booking.date} ${booking.start_time}–${booking.end_time} consultation.`,
    `/bookings/${id}`,
  );

  // Keep the admin in the loop.
  await notifyAdmins(
    "booking_cancelled",
    "Consultation cancelled",
    `${user.first_name} ${user.last_name} cancelled the ${booking.date} ${booking.start_time}–${booking.end_time} consultation.`,
    `/admin`,
    user.id,
  );

  go(back, "ok", "Booking cancelled.");
}

// ---------------------------------------------------------------------------
// C1 — Chatbox: send an ONLINE LINK (only once the scheduled time arrives)
// ---------------------------------------------------------------------------
export async function sendMessageAction(formData: FormData): Promise<void> {
  const user = await getSession();
  if (!user) redirect("/login");

  const bookingId = Number(formData.get("booking_id"));
  const body = String(formData.get("body") ?? "").trim();

  if (!Number.isFinite(bookingId)) go("/bookings", "error", "Invalid booking.");

  const { data: booking } = await db()
    .from("bookings")
    .select("id, student_id, faculty_id, status, date, start_time, end_time")
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking) go("/bookings", "error", "Booking not found.");

  // Only the 2 booked parties may use the chatbox
  if (booking.student_id !== user.id && booking.faculty_id !== user.id) {
    go(`/bookings/${bookingId}`, "error", "You are not part of this booking.");
  }
  if (booking.status !== "approved") {
    go(`/bookings/${bookingId}`, "error", "The chatbox opens only for approved consultations.");
  }

  // LINK ONLY — https meeting links (Google Meet, Zoom, …)
  let link: URL;
  try {
    link = new URL(body);
    if (link.protocol !== "https:") throw new Error("bad protocol");
  } catch {
    go(`/bookings/${bookingId}`, "error", "Chatbox accepts online meeting links only (https://…).");
  }

  // Only once the scheduled time has arrived (local time)
  const [y, m, d] = booking.date.split("-").map(Number);
  const [hh, mm] = booking.start_time.split(":").map(Number);
  const when = new Date(y, m - 1, d, hh, mm);
  if (Date.now() < when.getTime()) {
    go(
      `/bookings/${bookingId}`,
      "error",
      `The chatbox opens at the scheduled time — ${booking.date} ${booking.start_time}.`,
    );
  }

  const { error } = await db()
    .from("messages")
    .insert({ booking_id: bookingId, sender_id: user.id, body: link.toString() });

  if (error) go(`/bookings/${bookingId}`, "error", `Could not send: ${error.message}`);

  const otherId = user.id === booking.student_id ? booking.faculty_id : booking.student_id;
  await notify(
    otherId,
    "new_link",
    "Online link shared",
    `${user.first_name} ${user.last_name} shared a meeting link for ${booking.date} ${booking.start_time}.`,
    `/bookings/${bookingId}`,
  );

  revalidatePath(`/bookings/${bookingId}`);
  redirect(`/bookings/${bookingId}?ok=${encodeURIComponent("Link shared.")}`);
}

// ---------------------------------------------------------------------------
// N1 — Notifications: mark one as read
// ---------------------------------------------------------------------------
export async function markNotificationReadAction(formData: FormData): Promise<void> {
  const user = await getSession();
  if (!user) redirect("/login");

  const id = Number(formData.get("id"));
  if (!Number.isFinite(id)) redirect("/notifications");

  await db()
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id)
    .eq("user_id", user.id); // never touch someone else's

  revalidatePath("/notifications");
  redirect("/notifications");
}

// ---------------------------------------------------------------------------
// N2 — Notifications: mark all as read
// ---------------------------------------------------------------------------
export async function markAllReadAction(): Promise<void> {
  const user = await getSession();
  if (!user) redirect("/login");

  await db()
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  revalidatePath("/notifications");
  redirect("/notifications");
}

// ---------------------------------------------------------------------------
// Booking status label helper lives in ./format.ts (statusLabel) — a
// "use server" file may only export async server actions.
// ---------------------------------------------------------------------------
