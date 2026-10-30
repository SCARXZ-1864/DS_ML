import { notFound } from "next/navigation";
import { data } from "./index";
import type { Shop } from "./schemas";

/** Loads a shop or shows the segment's "Shop not found" page. Checkpoint 3 adds the owner check here. */
export async function requireShop(id: string): Promise<Shop> {
  const shop = await data.getShop(id);
  if (!shop) notFound();
  return shop;
}
