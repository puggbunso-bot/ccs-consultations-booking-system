import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes } from "node:crypto";
import { db } from "./supabase";
import type { Role, SessionUser } from "./types";

const COOKIE_NAME = "ccs_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

/** Where each role lands after login. */
export function homeFor(role: Role): string {
  if (role === "admin") return "/admin";
  if (role === "faculty") return "/faculty";
  return "/browse";
}

/** Creates a session row + sets the httpOnly cookie. */
export async function createSession(userId: number): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + MAX_AGE_SECONDS * 1000);

  const { error } = await db()
    .from("sessions")
    .insert({ user_id: userId, token, expires_at: expiresAt.toISOString() });
  if (error) throw new Error(`Could not create session: ${error.message}`);

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
    secure: process.env.NODE_ENV === "production",
  });
}

/** Returns the logged-in user, or null. Validates the session against the DB. */
export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const { data: session } = await db()
    .from("sessions")
    .select("user_id, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (!session) return null;

  // Expired → clean up and treat as logged out
  if (new Date(session.expires_at).getTime() < Date.now()) {
    await db().from("sessions").delete().eq("token", token);
    return null;
  }

  const { data: user } = await db()
    .from("users")
    .select("*")
    .eq("id", session.user_id)
    .maybeSingle();

  if (!user || user.status !== "active") return null;
  return user as SessionUser;
}

/** Requires a logged-in user with one of the given roles, else redirects. */
export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await getSession();
  if (!user) redirect("/login");
  if (!roles.includes(user.role)) redirect(homeFor(user.role));
  return user;
}

/** Deletes the DB session + clears the cookie. */
export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (token) {
    await db().from("sessions").delete().eq("token", token);
  }
  store.delete(COOKIE_NAME);
}
