import type { ColumnGuess, ColumnRole } from "@/lib/data/schemas";
import { parseDate } from "./rows";

const NAME = {
  text: /review|text|comment|feedback|body|content/i,
  stars: /star|rating|score/i,
  date: /date|time|created|posted/i,
};

const mostly = (values: string[], test: (v: string) => boolean) =>
  values.length > 0 && values.filter(test).length / values.length >= 0.9;

/**
 * A first guess at what each column holds, for the owner to confirm. Column names come
 * first; then the values decide (dates that parse, the longest free text). Each role goes to
 * one column at most, and the rest are ignored.
 */
export function guessColumns(header: string[], rows: string[][]): ColumnGuess[] {
  const values = header.map((_, i) => rows.map((r) => (r[i] ?? "").trim()).filter((v) => v !== ""));
  const roles: ColumnRole[] = header.map(() => "ignore");
  const take = (role: ColumnRole, pick: (i: number) => boolean) => {
    if (roles.includes(role)) return;
    const i = header.findIndex((_, idx) => roles[idx] === "ignore" && pick(idx));
    if (i >= 0) roles[i] = role;
  };

  take("stars", (i) => NAME.stars.test(header[i]) && mostly(values[i], (v) => /^[1-5]$/.test(v)));
  take("date", (i) => NAME.date.test(header[i]) && mostly(values[i], (v) => parseDate(v) !== null));
  take("text", (i) => NAME.text.test(header[i]));
  take("date", (i) => mostly(values[i], (v) => parseDate(v) !== null));

  if (!roles.includes("text")) {
    const avg = values.map((vs) => (vs.length ? vs.reduce((s, v) => s + v.length, 0) / vs.length : 0));
    const best = avg.reduce((bi, a, i) => (roles[i] === "ignore" && a > (avg[bi] ?? -1) ? i : bi), -1);
    if (best >= 0 && roles[best] === "ignore" && avg[best] >= 20) roles[best] = "text";
  }

  return header.map((column, i) => ({ column, role: roles[i], samples: values[i].slice(0, 3) }));
}
