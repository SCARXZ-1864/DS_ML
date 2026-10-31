import { cookies } from "next/headers";

// Mock session: a plain cookie holding the user id. Anyone could forge it, which is fine for
// a demo with no real data; Part 5 replaces this file with Supabase Auth.

export const SESSION_COOKIE = "ri_session";
const THIRTY_DAYS = 60 * 60 * 24 * 30;

/** Reads the request's cookies, so call it inside a <Suspense> boundary, an action or a route handler. */
export async function getSessionUserId(): Promise<string | null> {
  return (await cookies()).get(SESSION_COOKIE)?.value || null;
}

/** Only works in a Server Action or route handler, where the response can still set cookies. */
export async function setSession(userId: string): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, userId, {
    httpOnly: true, // page scripts can't read it
    sameSite: "lax", // not sent with cross-site form posts
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: THIRTY_DAYS,
  });
}

export async function clearSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
