import type { ShopType } from "@/lib/data/schemas";

// All number, percent and date formatting lives here, so every screen agrees.

const intFormat = new Intl.NumberFormat("en-US");

export function fmtInt(n: number): string {
  return intFormat.format(Math.round(n));
}

export function fmtPct(n: number | null, digits = 1): string {
  return n === null ? "—" : `${n.toFixed(digits)}%`;
}

export function fmtStars(n: number | null): string {
  return n === null ? "—" : n.toFixed(2);
}

/** "2026-10" → "Oct 2026" */
export function fmtMonth(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** +12, −12 (a real minus sign, U+2212), 0 */
export function fmtSigned(n: number | null): string {
  if (n === null) return "—";
  if (n > 0) return `+${n}`;
  if (n < 0) return `−${Math.abs(n)}`;
  return "0";
}

const SHOP_TYPE_LABELS: Record<ShopType, string> = {
  restaurant: "Restaurant",
  grocery: "Grocery",
  electronics: "Electronics & appliances",
  clothing: "Clothing & fashion",
  salon: "Salon & spa",
  other: "Other",
};

export function shopTypeLabel(type: ShopType): string {
  return SHOP_TYPE_LABELS[type];
}
