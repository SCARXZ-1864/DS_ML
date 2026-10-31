import type { Shop } from "@/lib/data/schemas";

// The access rule (spec §6) as plain functions, so it can be tested without a request.

export type Access = "ok" | "login" | "not-found";

/** Demo shops are public; an owner shop is visible only to its owner. Never reveals that a shop exists. */
export function shopAccess(shop: Shop, ownerId: string | null, viewerId: string | null): Access {
  if (shop.isDemo) return "ok";
  if (viewerId === null) return "login";
  return ownerId !== null && ownerId === viewerId ? "ok" : "not-found";
}

const SAME_SITE = "http://same-site.invalid";

/**
 * Where to go after logging in. Only paths inside this app are allowed: "//host", "/\host" and
 * "/<tab>/host" (browsers strip tabs and newlines) all mean another website, which could be a
 * phishing page. So control characters and backslashes are refused, and the path must still be
 * on this site after a browser-style parse.
 */
export function safeNext(next: unknown): string {
  if (typeof next !== "string" || !next.startsWith("/") || /[\u0000-\u001f\u007f\\]/.test(next)) return "/app";
  try {
    return new URL(next, SAME_SITE).origin === SAME_SITE ? next : "/app";
  } catch {
    return "/app";
  }
}

const DEMO_OWNER_EMAIL = "owner@demo.test";

/** Mock accounts: the sample owner, or a stable id derived from the email. */
export function userIdForEmail(email: string): string {
  const normal = email.trim().toLowerCase();
  if (normal === DEMO_OWNER_EMAIL) return "u-demo-owner";
  return `u-${normal.replace(/[^a-z0-9]/g, "-")}`;
}
