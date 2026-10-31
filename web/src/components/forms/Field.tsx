import type { ReactNode } from "react";

export const INPUT =
  "w-full border border-line bg-panel-2 px-3 py-2 text-ink placeholder:text-muted focus:border-accent focus:outline-none aria-[invalid=true]:border-neg";
export const BUTTON =
  "bg-accent px-4 py-2 font-semibold text-bg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";
export const BUTTON_QUIET =
  "border border-line px-3 py-1.5 text-sm text-ink transition-colors hover:border-accent disabled:cursor-not-allowed disabled:opacity-50";

type ControlAria = { id: string; "aria-invalid"?: true; "aria-describedby"?: string };

type FieldProps = {
  name: string;
  label: string;
  error?: string;
  hint?: ReactNode;
  /** Renders a custom control (e.g. a select) instead of an input; spread the given props onto it. */
  children?: (aria: ControlAria) => ReactNode;
  type?: string;
  autoComplete?: string;
  defaultValue?: string;
};

/** A labelled form field whose error is linked to the control and kept out of its label. */
export function Field({ name, label, error, hint, children, type = "text", autoComplete, defaultValue }: FieldProps) {
  const errorId = `${name}-error`;
  const aria: ControlAria = { id: name, ...(error ? { "aria-invalid": true, "aria-describedby": errorId } : {}) };
  return (
    <div className="grid gap-1.5 text-sm">
      <label htmlFor={name}>{label}</label>
      {children ? (
        children(aria)
      ) : (
        <input {...aria} name={name} type={type} autoComplete={autoComplete} defaultValue={defaultValue} required className={INPUT} />
      )}
      {hint && !error && <span className="text-muted">{hint}</span>}
      {error && <span id={errorId} className="text-neg">{error}</span>}
    </div>
  );
}

/** A form-level result: announced politely on success, assertively on failure. */
export function FormMessage({ ok, message }: { ok: boolean; message?: string }) {
  if (!message) return null;
  return ok ? (
    <p role="status" className="text-sm text-pos">{message}</p>
  ) : (
    <p role="alert" className="text-sm text-neg">{message}</p>
  );
}
