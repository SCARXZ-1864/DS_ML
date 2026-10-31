"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { data } from "@/lib/data";
import { ownerGuard } from "@/lib/data/load";
import type { ActionState } from "@/lib/data/schemas";

// Every action re-checks ownership: a Server Action is a public endpoint, so the page having
// hidden the button is not protection on its own.
const NOT_FOUND: ActionState = { ok: false, message: "Shop not found" };

export async function connectGoogleAction(shopId: string, locationId: string): Promise<ActionState> {
  const guard = await ownerGuard(shopId);
  if ("error" in guard) return NOT_FOUND;
  const user = await data.getUser(guard.userId);
  const source = await data.connectGoogle(shopId, { locationId, accountLabel: user?.email ?? "Google account" });
  if (!source) return { ok: false, message: "Pick one of your locations." };
  redirect(`/shops/${shopId}/sources`);
}

export async function syncNowAction(shopId: string, sourceId: string): Promise<ActionState> {
  const guard = await ownerGuard(shopId);
  if ("error" in guard) return NOT_FOUND;
  if (!(await data.syncSource(shopId, sourceId))) return { ok: false, message: "That source can't sync right now." };
  revalidatePath(`/shops/${shopId}`, "layout");
  return { ok: true };
}

export async function disconnectAction(shopId: string, sourceId: string): Promise<ActionState> {
  const guard = await ownerGuard(shopId);
  if ("error" in guard) return NOT_FOUND;
  if (!(await data.disconnectSource(shopId, sourceId))) return NOT_FOUND;
  revalidatePath(`/shops/${shopId}`, "layout");
  return { ok: true };
}
