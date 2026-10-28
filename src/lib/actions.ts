"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { db } from "./supabase";
import { createSession, destroySession, getSession, homeFor } from "./auth";
import { weekdayOf } from "./format";
import { type Day, type Role, type UserRow } from "./types";

const TIME_RE = /^\d{2}:\d{2}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function go(path: string, key: "error" | "ok", message: string): never {
  redirect(`${path}?${key}=${encodeURIComponent(message)}`);
}

// ---------------------------------------------------------------------------
// F1 — Login
// ---------------------------------------------------------------------------
export async function loginAction(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    go("/login", "error", "Please enter your email and password.");
  }

  const { data } = await db().from("users").select("*").eq("email", email).maybeSingle();
  const user = data as UserRow | null;

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    go("/login", "error", "Incorrect email or password.");
  }
  if (user.status === "pending") {
    go(
      "/login",
      "error",
      "Your account is still pending approval. Please wait for the administrator to approve it.",
    );
  }
  if (user.status !== "active") {
    go("/login", "error", "This account is deactivated. Contact the administrator.");
  }

  await createSession(user.id);
  redirect(homeFor(user.role));
}

// ---------------------------------------------------------------------------
// F2 — Logout
// ---------------------------------------------------------------------------
export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}

// ---------------------------------------------------------------------------
// F3 — Faculty: add availability (an EXACT date + time window + room)
// ---------------------------------------------------------------------------
export async function addAvailabilityAction(formData: FormData): Promise<void> {
  const user = await getSession();
  if (!user || user.role !== "faculty") redirect("/login");

  const date = String(formData.get("date") ?? "");
  const start = String(formData.get("start_time") ?? "");
  const end = String(formData.get("end_time") ?? "");
  const room = String(formData.get("room") ?? "").trim() || user.room;

  if (!DATE_RE.test(date)) {
    go("/faculty", "error", "Please choose a valid date.");
  }
  if (!TIME_RE.test(start) || !TIME_RE.test(end)) {
    go("/faculty", "error", "Please enter valid times.");
  }
  if (end <= start) {
    go("/faculty", "error", "End time must be later than start time.");
  }

  // The weekday is derived from the date, so the two can never disagree.
  const day: Day = weekdayOf(date);

  // One slot per faculty per date+time — no accidental duplicates.
  const { data: dupe } = await db()
    .from("availability")
    .select("id")
    .eq("faculty_id", user.id)
    .eq("date", date)
    .eq("start_time", start)
    .maybeSingle();

  if (dupe) {
    go("/faculty", "error", `You are already available on ${date} at ${start}.`);
  }

  const { error } = await db()
    .from("availability")
    .insert({ faculty_id: user.id, day, date, start_time: start, end_time: end, room });

  if (error) go("/faculty", "error", `Could not save: ${error.message}`);
  go("/faculty", "ok", `Added ${date} (${day}), ${start}–${end}.`);
}

// ---------------------------------------------------------------------------
// F4 — Faculty: edit own availability
// ---------------------------------------------------------------------------
export async function updateAvailabilityAction(formData: FormData): Promise<void> {
  const user = await getSession();
  if (!user || user.role !== "faculty") redirect("/login");

  const id = Number(formData.get("id"));
  const date = String(formData.get("date") ?? "");
  const start = String(formData.get("start_time") ?? "");
  const end = String(formData.get("end_time") ?? "");
  const room = String(formData.get("room") ?? "").trim();

  if (!Number.isFinite(id)) go("/faculty", "error", "Invalid schedule entry.");
  if (!DATE_RE.test(date)) {
    go("/faculty/edit/" + id, "error", "Please choose a valid date.");
  }
  if (!TIME_RE.test(start) || !TIME_RE.test(end)) {
    go("/faculty/edit/" + id, "error", "Please enter valid times.");
  }
  if (end <= start) {
    go("/faculty/edit/" + id, "error", "End time must be later than start time.");
  }

  const day: Day = weekdayOf(date);

  // Ownership check — faculty can only edit their own rows
  const { data: existing } = await db()
    .from("availability")
    .select("faculty_id")
    .eq("id", id)
    .maybeSingle();

  if (!existing || existing.faculty_id !== user.id) {
    go("/faculty", "error", "You can only edit your own schedule.");
  }

  const { error } = await db()
    .from("availability")
    .update({ day, date, start_time: start, end_time: end, room })
    .eq("id", id);

  if (error) go("/faculty", "error", `Could not update: ${error.message}`);
  go("/faculty", "ok", "Schedule updated.");
}

// ---------------------------------------------------------------------------
// F5 / F12 — Delete availability (faculty: own row · admin: any row)
// ---------------------------------------------------------------------------
export async function deleteAvailabilityAction(formData: FormData): Promise<void> {
  const user = await getSession();
  if (!user) redirect("/login");

  const id = Number(formData.get("id"));
  const from = String(formData.get("from") ?? "") === "admin" ? "/admin" : "/faculty";
  if (!Number.isFinite(id)) go(from, "error", "Invalid schedule entry.");

  if (user.role === "faculty") {
    const { data: existing } = await db()
      .from("availability")
      .select("faculty_id")
      .eq("id", id)
      .maybeSingle();
    if (!existing || existing.faculty_id !== user.id) {
      go("/faculty", "error", "You can only delete your own schedule.");
    }
  } else if (user.role !== "admin") {
    redirect("/login"); // students cannot delete
  }

  const { error } = await db().from("availability").delete().eq("id", id);
  if (error) go(from, "error", `Could not delete: ${error.message}`);
  go(from, "ok", "Schedule entry deleted.");
}

// ---------------------------------------------------------------------------
// F10 — Admin: create a user (faculty or student)
// ---------------------------------------------------------------------------
export async function adminCreateUserAction(formData: FormData): Promise<void> {
  const admin = await getSession();
  if (!admin || admin.role !== "admin") redirect("/login");

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "") as Role;
  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const specialization = String(formData.get("specialization") ?? "").trim() || null;
  const room = String(formData.get("room") ?? "").trim() || null;

  if (!email || !password || !firstName || !lastName) {
    go("/admin", "error", "Fill in all required fields.");
  }
  if (role !== "faculty" && role !== "student") {
    go("/admin", "error", "Role must be faculty or student.");
  }
  if (password.length < 6) {
    go("/admin", "error", "Password must be at least 6 characters.");
  }

  const { data: taken } = await db().from("users").select("id").eq("email", email).maybeSingle();
  if (taken) go("/admin", "error", "That email is already registered.");

  const password_hash = await bcrypt.hash(password, 10);
  const { error } = await db().from("users").insert({
    email,
    password_hash,
    role,
    first_name: firstName,
    last_name: lastName,
    specialization: role === "faculty" ? specialization : null,
    room: role === "faculty" ? room : null,
    status: "active",
  });

  if (error) go("/admin", "error", `Could not create user: ${error.message}`);
  go("/admin", "ok", `${firstName} ${lastName} created (${role}).`);
}

// ---------------------------------------------------------------------------
// F10 — Admin: activate / deactivate an account
// ---------------------------------------------------------------------------
export async function adminToggleStatusAction(formData: FormData): Promise<void> {
  const admin = await getSession();
  if (!admin || admin.role !== "admin") redirect("/login");

  const id = Number(formData.get("id"));
  if (!Number.isFinite(id)) go("/admin", "error", "Invalid user.");
  if (id === admin.id) go("/admin", "error", "You cannot deactivate your own account.");

  const { data: target } = await db().from("users").select("status").eq("id", id).maybeSingle();
  if (!target) go("/admin", "error", "User not found.");
  if (target.status === "pending") {
    go("/admin", "error", "This account is pending approval — use the Approve button.");
  }

  const next = target.status === "active" ? "inactive" : "active";
  const { error } = await db().from("users").update({ status: next }).eq("id", id);

  if (error) go("/admin", "error", `Could not update: ${error.message}`);

  // Deactivating kicks the user out immediately
  if (next === "inactive") {
    await db().from("sessions").delete().eq("user_id", id);
  }
  go("/admin", "ok", `Account ${next === "active" ? "activated" : "deactivated"}.`);
}

// ---------------------------------------------------------------------------
// F10 — Admin: delete a user (cascades to availability + sessions)
// ---------------------------------------------------------------------------
export async function adminDeleteUserAction(formData: FormData): Promise<void> {
  const admin = await getSession();
  if (!admin || admin.role !== "admin") redirect("/login");

  const id = Number(formData.get("id"));
  if (!Number.isFinite(id)) go("/admin", "error", "Invalid user.");
  if (id === admin.id) go("/admin", "error", "You cannot delete your own account.");

  const { error } = await db().from("users").delete().eq("id", id);
  if (error) go("/admin", "error", `Could not delete: ${error.message}`);
  go("/admin", "ok", "User deleted.");
}

// ---------------------------------------------------------------------------
// F14 — Admin: approve a pending registration (student or faculty)
// ---------------------------------------------------------------------------
export async function adminApproveUserAction(formData: FormData): Promise<void> {
  const admin = await getSession();
  if (!admin || admin.role !== "admin") redirect("/login");

  const id = Number(formData.get("id"));
  if (!Number.isFinite(id)) go("/admin", "error", "Invalid user.");

  const { data: target } = await db()
    .from("users")
    .select("status, first_name, last_name")
    .eq("id", id)
    .maybeSingle();

  if (!target) go("/admin", "error", "User not found.");
  if (target.status !== "pending") {
    go("/admin", "error", "Only pending accounts can be approved.");
  }

  const { error } = await db().from("users").update({ status: "active" }).eq("id", id);
  if (error) go("/admin", "error", `Could not approve: ${error.message}`);

  go(
    "/admin",
    "ok",
    `Approved ${target.first_name} ${target.last_name} — they can now sign in.`,
  );
}

// ---------------------------------------------------------------------------
// F13 — Student: self-registration
// ---------------------------------------------------------------------------
export async function registerAction(formData: FormData): Promise<void> {
  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const role = String(formData.get("role") ?? "student");
  const specialization = String(formData.get("specialization") ?? "").trim() || null;
  const room = String(formData.get("room") ?? "").trim() || null;

  const fail = (msg: string): never => go("/register", "error", msg);

  if (role !== "student" && role !== "faculty") {
    fail("Please choose either student or faculty.");
  }
  if (!firstName || !lastName || !email || !password) {
    fail("Please fill in all fields.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fail("Please enter a valid email address.");
  }
  if (password.length < 6) {
    fail("Password must be at least 6 characters.");
  }
  if (password !== confirm) {
    fail("Passwords do not match.");
  }

  const { data: taken } = await db().from("users").select("id").eq("email", email).maybeSingle();
  if (taken) fail("That email is already registered. Try signing in instead.");

  const password_hash = await bcrypt.hash(password, 10);
  const { error } = await db().from("users").insert({
    email,
    password_hash,
    role,
    first_name: firstName,
    last_name: lastName,
    specialization: role === "faculty" ? specialization : null,
    room: role === "faculty" ? room : null,
    // Self-registered accounts must be approved by an admin first
    status: "pending",
  });

  if (error) fail(`Could not create account: ${error.message}`);

  // No session yet — login is blocked until the admin approves the account
  go(
    "/register",
    "ok",
    `Account created for ${firstName} ${lastName}! Please wait for the administrator to approve your ${
      role === "faculty" ? "faculty" : "student"
    } account, then sign in.`,
  );
}
