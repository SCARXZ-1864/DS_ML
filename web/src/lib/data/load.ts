import { notFound, redirect } from "next/navigation";
import { shopAccess } from "@/lib/auth/access";
import { getSessionUserId } from "@/lib/auth/session";
import { data } from "./index";
import type { Shop } from "./schemas";

export type ShopForViewer = { shop: Shop; viewerId: string | null; canManage: boolean };

/**
 * Loads a shop for whoever is asking, applying the one access rule: a logged-out visitor on an
 * owner shop goes to the login page, anyone else who may not see it gets "Shop not found".
 * `path` is where to come back to after logging in.
 */
export async function loadShopForViewer(shopId: string, path: string, opts: { ownerOnly?: boolean } = {}): Promise<ShopForViewer> {
  const [shop, ownerId, viewerId] = await Promise.all([data.getShop(shopId), data.getShopOwner(shopId), getSessionUserId()]);
  if (!shop) notFound();
  const access = shopAccess(shop, ownerId, viewerId);
  if (access === "login") redirect(`/login?next=${encodeURIComponent(path)}`);
  if (access === "not-found") notFound();
  const canManage = !shop.isDemo && viewerId !== null && ownerId === viewerId;
  if (opts.ownerOnly && !canManage) notFound();
  return { shop, viewerId, canManage };
}

/** The same rule for API routes and Server Actions, which answer with an error instead of a page. */
export async function ownerGuard(shopId: string): Promise<{ userId: string } | { error: "UNAUTHORIZED" | "NOT_FOUND" }> {
  const viewerId = await getSessionUserId();
  if (!viewerId) return { error: "UNAUTHORIZED" };
  const [shop, ownerId] = await Promise.all([data.getShop(shopId), data.getShopOwner(shopId)]);
  if (!shop || shop.isDemo || ownerId !== viewerId) return { error: "NOT_FOUND" };
  return { userId: viewerId };
}
