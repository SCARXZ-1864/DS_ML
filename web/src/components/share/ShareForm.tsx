"use client";

import { useActionState } from "react";
import { BUTTON, FormMessage } from "@/components/forms/Field";
import { type ActionState, SharePeriodSchema, ShareSectionSchema } from "@/lib/data/schemas";
import { PERIOD_LABEL, SECTION_LABEL } from "./labels";

type Props = { action: (prev: ActionState, form: FormData) => Promise<ActionState> };

/** Choose the period and sections for a new read-only report link. */
export function ShareForm({ action }: Props) {
  const [state, formAction, pending] = useActionState(action, { ok: true });
  const sectionsError = state.fieldErrors?.sections;
  return (
    <form action={formAction} className="grid gap-4 border border-line bg-panel p-5">
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm">Period</legend>
        <div className="flex flex-wrap gap-4">
          {SharePeriodSchema.options.map((p) => (
            <label key={p} className="flex items-center gap-2 text-sm">
              <input type="radio" name="period" value={p} defaultChecked={p === "90d"} className="accent-accent" />
              {PERIOD_LABEL[p]}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="grid gap-2" aria-describedby={sectionsError ? "sections-error" : undefined}>
        <legend className="mb-1 text-sm">Include</legend>
        <div className="flex flex-wrap gap-4">
          {ShareSectionSchema.options.map((s) => (
            <label key={s} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="sections" value={s} defaultChecked className="accent-accent" />
              {SECTION_LABEL[s]}
            </label>
          ))}
        </div>
        {sectionsError && <p id="sections-error" className="text-sm text-neg">{sectionsError}</p>}
      </fieldset>
      <FormMessage ok={state.ok} message={state.message} />
      <button type="submit" disabled={pending} className={`${BUTTON} justify-self-start`}>
        {pending ? "Creating…" : "Create link"}
      </button>
    </form>
  );
}
