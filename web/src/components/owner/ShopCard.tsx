import Link from "next/link";
import { Sparkline } from "@/components/charts/Sparkline";
import type { Shop } from "@/lib/data/schemas";
import { fmtInt, shopTypeLabel } from "@/lib/format";

/** One owner shop on "My shops": volume trend, review count and unread alerts at a glance. */
export function ShopCard({ shop, monthlyCounts }: { shop: Shop; monthlyCounts: number[] | null }) {
  return (
    <Link href={`/shops/${shop.id}/overview`} className="block border border-line bg-panel p-4 transition-colors hover:border-accent">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="label">{shopTypeLabel(shop.type)}</p>
          <p className="mt-1 truncate font-serif text-xl" title={shop.name}>{shop.name}</p>
        </div>
        {shop.unreadAlerts > 0 && (
          <span className="shrink-0 bg-neg px-2 py-0.5 text-xs font-semibold text-bg">
            {shop.unreadAlerts} new alert{shop.unreadAlerts === 1 ? "" : "s"}
          </span>
        )}
      </div>
      {monthlyCounts ? (
        <>
          <Sparkline values={monthlyCounts} tone="neutral" />
          <p className="text-sm text-muted">
            <span className="font-mono text-ink">{fmtInt(shop.reviewCount)}</span> reviews
          </p>
        </>
      ) : (
        <p className="mt-6 text-sm text-muted">No reviews yet</p>
      )}
    </Link>
  );
}
