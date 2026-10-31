"use server";

import { refresh } from "next/cache";
import { data } from "@/lib/data";
import { ownerGuard } from "@/lib/data/load";
import { type ActionState, ShareInputSchema } from "@/lib/data/schemas";
import { field, invalid } from "@/lib/forms";

const NOT_FOUND: ActionState = { ok: false, message: "Shop not found" };

/** Bound to a shop id on the page: createLinkAction.bind(null, shopId). */
export async function createLinkAction(shopId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  if ("error" in (await ownerGuard(shopId))) return NOT_FOUND;
  const parsed = ShareInputSchema.safeParse({ period: field(form, "period"), sections: form.getAll("sections").map(String) });
  if (!parsed.success) return invalid(parsed.error);
  await data.createShareLink(shopId, parsed.data);
  refresh();
  return { ok: true, message: "Link created" };
}

export async function revokeLinkAction(shopId: string, token: string): Promise<ActionState> {
  if ("error" in (await ownerGuard(shopId))) return NOT_FOUND;
  if (!(await data.revokeShareLink(shopId, token))) return NOT_FOUND;
  refresh();
  return { ok: true };
}
