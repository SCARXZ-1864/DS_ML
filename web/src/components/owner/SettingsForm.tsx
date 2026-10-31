"use client";

import { useActionState } from "react";
import { BUTTON, Field, FormMessage } from "@/components/forms/Field";
import type { ActionState, User } from "@/lib/data/schemas";

type Props = { user: User; action: (prev: ActionState, form: FormData) => Promise<ActionState> };

export function SettingsForm({ user, action }: Props) {
  const [state, formAction, pending] = useActionState(action, { ok: true });
  const errors = state.fieldErrors ?? {};
  return (
    <form action={formAction} className="grid max-w-md gap-4" noValidate>
      <Field name="name" label="Your name" autoComplete="name" defaultValue={user.name} error={errors.name} />
      <Field
        name="alertEmail"
        label="Send alerts to"
        type="email"
        autoComplete="email"
        defaultValue={user.alertEmail}
        error={errors.alertEmail}
        hint={`You sign in as ${user.email}.`}
      />
      <FormMessage ok={state.ok} message={state.message} />
      <button type="submit" disabled={pending} className={`${BUTTON} justify-self-start`}>
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
