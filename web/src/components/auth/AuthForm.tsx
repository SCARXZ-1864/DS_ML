"use client";

import Link from "next/link";
import { useActionState } from "react";
import { BUTTON, Field, FormMessage } from "@/components/forms/Field";
import type { ActionState } from "@/lib/data/schemas";

type Props = {
  mode: "login" | "signup";
  action: (prev: ActionState, form: FormData) => Promise<ActionState>;
  next: string;
};

/** Login and signup share one form; the Server Action decides what happens. */
export function AuthForm({ mode, action, next }: Props) {
  const [state, formAction, pending] = useActionState(action, { ok: true });
  const errors = state.fieldErrors ?? {};
  const isLogin = mode === "login";
  const other = `/${isLogin ? "signup" : "login"}?next=${encodeURIComponent(next)}`;

  return (
    <form action={formAction} className="grid gap-4" noValidate>
      <input type="hidden" name="next" value={next} />
      {!isLogin && <Field name="name" label="Your name" autoComplete="name" error={errors.name} />}
      <Field name="email" label="Email" type="email" autoComplete="email" error={errors.email} />
      <Field
        name="password"
        label="Password"
        type="password"
        autoComplete={isLogin ? "current-password" : "new-password"}
        error={errors.password}
      />
      <FormMessage ok={state.ok} message={state.message} />
      <button type="submit" disabled={pending} className={BUTTON}>
        {pending ? (isLogin ? "Signing in…" : "Creating account…") : isLogin ? "Log in" : "Create account"}
      </button>
      {isLogin && (
        <p className="border-l-2 border-info pl-3 text-sm text-muted">
          Mock sign-in: any email and password work. Use owner@demo.test to see the sample owner shops.
        </p>
      )}
      <p className="text-sm text-muted">
        {isLogin ? "New here? " : "Already have an account? "}
        <Link href={other} className="text-ink underline underline-offset-2 hover:text-accent">
          {isLogin ? "Create an account" : "Log in"}
        </Link>
      </p>
    </form>
  );
}
