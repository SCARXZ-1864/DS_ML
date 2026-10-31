"use client";

import { useActionState } from "react";
import { BUTTON, Field, FormMessage, INPUT } from "@/components/forms/Field";
import { type ActionState, ShopTypeSchema } from "@/lib/data/schemas";
import { shopTypeLabel } from "@/lib/format";

type Props = { action: (prev: ActionState, form: FormData) => Promise<ActionState> };

export function NewShopForm({ action }: Props) {
  const [state, formAction, pending] = useActionState(action, { ok: true });
  const errors = state.fieldErrors ?? {};
  return (
    <form action={formAction} className="grid max-w-md gap-4" noValidate>
      <Field name="name" label="Shop name" autoComplete="organization" error={errors.name} />
      <Field name="type" label="Type of shop" error={errors.type} hint="Only a label: what customers rate is found from the reviews.">
        {(aria) => (
          <select {...aria} name="type" defaultValue="restaurant" className={INPUT}>
            {ShopTypeSchema.options.map((t) => (
              <option key={t} value={t}>{shopTypeLabel(t)}</option>
            ))}
          </select>
        )}
      </Field>
      <FormMessage ok={state.ok} message={state.message} />
      <button type="submit" disabled={pending} className={`${BUTTON} justify-self-start`}>
        {pending ? "Creating…" : "Create shop"}
      </button>
    </form>
  );
}
