import type { Aspect, Comparison, Shop } from "../schemas";
import { getStore } from "./store";

export type CompareSide = { shop: Shop; aspects: Aspect[] };

/**
 * Two shops side by side, aspect by aspect. Aspects are matched by name (case-insensitive),
 * since each shop's aspects are found from its own reviews. net = % positive − % negative.
 */
export function compareShops(ids: [string, string]): Comparison | null {
  const [a, b] = ids.map((id) => getStore().entries.get(id));
  return a && b ? compareSides(a, b) : null;
}

/** The same comparison for two shops' aspects, wherever they were loaded from. */
export function compareSides(a: CompareSide, b: CompareSide): Comparison {

  const rows = new Map<string, Comparison["rows"][number]>();
  [a, b].forEach((entry, side) => {
    for (const aspect of entry.aspects) {
      if (aspect.mentions === 0) continue;
      const key = aspect.name.toLowerCase();
      const row = rows.get(key) ?? { group: aspect.group ?? "Other", name: aspect.name, net: [null, null] };
      row.net[side] = Math.round(aspect.posPct - aspect.negPct);
      rows.set(key, row);
    }
  });

  // Biggest differences first; aspects only one shop has go last.
  const gap = (r: Comparison["rows"][number]) => (r.net[0] === null || r.net[1] === null ? -1 : Math.abs(r.net[0] - r.net[1]));
  return { shops: [a.shop, b.shop], rows: [...rows.values()].sort((x, y) => gap(y) - gap(x)) };
}
