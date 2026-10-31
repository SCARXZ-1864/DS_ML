import { BUTTON, INPUT } from "@/components/forms/Field";
import type { Shop } from "@/lib/data/schemas";

/** Two shop selects in a plain GET form, so a comparison has a shareable URL (?a=…&b=…). */
export function ComparePicker({ shops, a, b }: { shops: Shop[]; a?: string; b?: string }) {
  const select = (name: "a" | "b", label: string, value?: string) => (
    <label className="grid gap-1.5 text-sm">
      {label}
      <select name={name} defaultValue={value ?? ""} required className={INPUT}>
        <option value="" disabled>Choose a shop</option>
        {shops.map((s) => (
          <option key={s.id} value={s.id}>{s.name}{s.isDemo ? " (demo)" : ""}</option>
        ))}
      </select>
    </label>
  );
  return (
    <form method="get" className="grid gap-3 border border-line bg-panel p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      {select("a", "First shop", a)}
      {select("b", "Second shop", b)}
      <button type="submit" className={BUTTON}>Compare</button>
    </form>
  );
}
