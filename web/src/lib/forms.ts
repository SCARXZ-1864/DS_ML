import type { z } from "zod";
import type { ActionState } from "@/lib/data/schemas";

/** Turns a validation error into one message per form field, for an ActionState. */
export function invalid(error: z.ZodError, message?: string): ActionState {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    fieldErrors[key] ??= issue.message;
  }
  return { ok: false, fieldErrors, ...(message ? { message } : {}) };
}

/** FormData values as plain strings (missing fields become ""). */
export const field = (form: FormData, name: string) => String(form.get(name) ?? "");
