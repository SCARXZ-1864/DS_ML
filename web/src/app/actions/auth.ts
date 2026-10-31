"use server";

import { redirect } from "next/navigation";
import { safeNext, userIdForEmail } from "@/lib/auth/access";
import { clearSession, setSession } from "@/lib/auth/session";
import { data } from "@/lib/data";
import { type ActionState, LoginSchema, SignupSchema } from "@/lib/data/schemas";
import { field, invalid } from "@/lib/forms";

// Mock auth: any credentials work and the password is never stored. Part 5 swaps in Supabase Auth.

export async function login(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = LoginSchema.safeParse({ email: field(form, "email"), password: field(form, "password") });
  if (!parsed.success) return invalid(parsed.error);
  const { email } = parsed.data;
  const id = userIdForEmail(email);
  if (!(await data.getUser(id))) {
    await data.saveUser({ id, name: email.split("@")[0], email, alertEmail: email });
  }
  await setSession(id);
  redirect(safeNext(form.get("next")));
}

export async function signup(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = SignupSchema.safeParse({ name: field(form, "name"), email: field(form, "email"), password: field(form, "password") });
  if (!parsed.success) return invalid(parsed.error);
  const { name, email } = parsed.data;
  const id = userIdForEmail(email);
  const existing = await data.getUser(id);
  await data.saveUser({ id, name, email, alertEmail: existing?.alertEmail ?? email });
  await setSession(id);
  redirect(safeNext(form.get("next")));
}

export async function logout(): Promise<void> {
  await clearSession();
  redirect("/");
}
