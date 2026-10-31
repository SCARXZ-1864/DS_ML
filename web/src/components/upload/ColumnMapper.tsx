"use client";

import { INPUT } from "@/components/forms/Field";
import type { ColumnGuess, ColumnRole } from "@/lib/data/schemas";

const ROLE_LABEL: Record<ColumnRole, string> = { text: "Review text", stars: "Star rating", date: "Date", ignore: "Ignore" };

type Props = { columns: ColumnGuess[]; roles: ColumnRole[]; onChange: (index: number, role: ColumnRole) => void };

/** One row per CSV column: what it holds (pre-filled from the guess) and a few sample values. */
export function ColumnMapper({ columns, roles, onChange }: Props) {
  return (
    <ul className="m-0 grid list-none gap-2 p-0">
      {columns.map((c, i) => {
        const id = `col-${i}`;
        return (
          <li key={id} className="grid gap-3 border border-line bg-panel p-3 sm:grid-cols-[14rem_1fr] sm:items-center">
            <div className="grid gap-1 text-sm">
              <label htmlFor={id}>What does “{c.column || `column ${i + 1}`}” hold?</label>
              <select id={id} value={roles[i]} onChange={(e) => onChange(i, e.target.value as ColumnRole)} className={INPUT}>
                {(Object.keys(ROLE_LABEL) as ColumnRole[]).map((r) => (
                  <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                ))}
              </select>
            </div>
            <p className="min-w-0 truncate font-mono text-xs text-muted" title={c.samples.join(" · ")}>
              {c.samples.length ? c.samples.join(" · ") : "(empty)"}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
