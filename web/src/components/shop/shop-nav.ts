export type ShopNavItem = { slug: string; label: string; ownerOnly?: boolean };

// Analytics pages are visible to everyone who can see the shop; owner-only pages
// appear only to the shop's owner, under "Manage".
export const SHOP_NAV: ShopNavItem[] = [
  { slug: "overview", label: "Overview" },
  { slug: "topics", label: "Topics" },
  { slug: "aspects", label: "Aspects" },
  { slug: "reviews", label: "Reviews" },
  { slug: "ask", label: "Ask" },
  { slug: "try", label: "Try it" },
  { slug: "sources", label: "Sources", ownerOnly: true },
  { slug: "uploads", label: "Uploads", ownerOnly: true },
  { slug: "alerts", label: "Alerts", ownerOnly: true },
  { slug: "share", label: "Share", ownerOnly: true },
];

export function visibleNav(canManage: boolean): ShopNavItem[] {
  return SHOP_NAV.filter((item) => canManage || !item.ownerOnly);
}
