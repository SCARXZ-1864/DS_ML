export type ShopNavItem = { slug: string; label: string; ownerOnly?: boolean };

// Pages appear here as they are built: checkpoint 2 adds the analytics pages,
// checkpoint 3 the owner-only ones (with ownerOnly: true).
export const SHOP_NAV: ShopNavItem[] = [
  { slug: "overview", label: "Overview" },
  { slug: "topics", label: "Topics" },
  { slug: "aspects", label: "Aspects" },
];

export function visibleNav(isDemo: boolean): ShopNavItem[] {
  return SHOP_NAV.filter((item) => !(item.ownerOnly && isDemo));
}
