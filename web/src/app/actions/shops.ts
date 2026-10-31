"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth/session";
import { data } from "@/lib/data";
import { type ActionState, NewShopSchema, SettingsSchema } from "@/lib/data/schemas";
import { field, invalid } from "@/lib/forms";

const LOGGED_OUT: ActionState = { ok: false, message: "Your session has ended. Log in again to continue." };

export async function createShopAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const userId = await getSessionUserId();
  if (!userId) return LOGGED_OUT;
  const parsed = NewShopSchema.safeParse({ name: field(form, "name"), type: field(form, "type") });
  if (!parsed.success) return invalid(parsed.error);
  const shop = await data.createShop(userId, parsed.data);
  redirect(`/shops/${shop.id}/sources?new=1`);
}

export async function saveSettings(_prev: ActionState, form: FormData): Promise<ActionState> {
  const userId = await getSessionUserId();
  const user = userId ? await data.getUser(userId) : null;
  if (!user) return LOGGED_OUT;
  const parsed = SettingsSchema.safeParse({ name: field(form, "name"), alertEmail: field(form, "alertEmail") });
  if (!parsed.success) return invalid(parsed.error);
  await data.saveUser({ ...user, ...parsed.data });
  refresh(); // the sidebar shows the name, so re-render the page with the new one
  return { ok: true, message: "Saved" };
}
