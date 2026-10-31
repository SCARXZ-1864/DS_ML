import Link from "next/link";
import { BUTTON, BUTTON_QUIET } from "@/components/forms/Field";
import type { Shop } from "@/lib/data/schemas";

/** Shown on every analytics page until a shop has reviews. */
export function EmptyShop({ shop, canManage }: { shop: Shop; canManage: boolean }) {
  return (
    <section className="animate-fade-rise mt-10 max-w-xl border border-line bg-panel p-8">
      <p className="label">{shop.name}</p>
      <h1 className="mt-2 font-serif text-3xl">No reviews yet</h1>
      <p className="mt-2 text-muted">Bring in reviews to see sentiment, aspects and topics.</p>
      {canManage && (
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={`/shops/${shop.id}/sources/connect`} className={BUTTON}>
            Connect Google Business Profile
          </Link>
          <Link href={`/shops/${shop.id}/uploads/new`} className={`${BUTTON_QUIET} py-2`}>
            Upload a CSV
          </Link>
        </div>
      )}
    </section>
  );
}
