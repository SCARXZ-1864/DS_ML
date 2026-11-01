import type { Shop } from "@/lib/data/schemas";

/**
 * Where "Upload reviews" takes someone: visitors log in first, an owner with no shop creates one
 * (its Sources page offers CSV upload), and an owner with one shop goes straight to its upload
 * screen. Null means the owner has several shops and picks one.
 */
export function uploadTarget(userId: string | null, shops: Shop[]): string | null {
  if (!userId) return `/login?next=${encodeURIComponent("/upload")}`;
  const own = shops.filter((s) => !s.isDemo);
  if (own.length === 0) return "/app/shops/new";
  if (own.length === 1) return `/shops/${own[0].id}/uploads/new`;
  return null;
}
