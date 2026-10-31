import Link from "next/link";
import { Suspense } from "react";
import { BUTTON } from "@/components/forms/Field";
import { ShopCard } from "@/components/owner/ShopCard";
import { PageHeader } from "@/components/shop/PageHeader";
import { PageSkeleton } from "@/components/shop/PageSkeleton";
import { requireUser } from "@/lib/auth/user";
import { data } from "@/lib/data";

export default function MyShopsPage() {
  return (
    <Suspense fallback={<PageSkeleton label="Loading your shops" />}>
      <MyShops />
    </Suspense>
  );
}

async function MyShops() {
  const user = await requireUser("/app");
  const shops = await data.listShops(user.id);
  const own = shops.filter((s) => !s.isDemo);
  const demos = shops.filter((s) => s.isDemo);
  const trends = await Promise.all(own.map(async (s) => (await data.getOverview(s.id))?.monthly.map((m) => m.count) ?? null));

  return (
    <div className="animate-fade-rise">
      <PageHeader eyebrow="Your account" title="My shops" />
      {own.length === 0 ? (
        <section className="mt-8 max-w-xl border border-line bg-panel p-8">
          <p className="font-serif text-2xl">Add your first shop to see what customers say about it.</p>
          <Link href="/app/shops/new" className={`${BUTTON} mt-5 inline-block`}>
            Add shop
          </Link>
          <p className="mt-6 text-sm text-muted">Or look around a demo first:</p>
          <ul className="mt-2 flex list-none flex-wrap gap-3 p-0 text-sm">
            {demos.map((d) => (
              <li key={d.id}>
                <Link href={`/shops/${d.id}/overview`} className="underline underline-offset-2 hover:text-accent">
                  {d.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <ul className="mt-6 grid list-none gap-4 p-0 sm:grid-cols-2 xl:grid-cols-3">
          {own.map((s, i) => (
            <li key={s.id}>
              <ShopCard shop={s} monthlyCounts={trends[i]} />
            </li>
          ))}
          <li>
            <Link
              href="/app/shops/new"
              className="flex h-full min-h-36 items-center justify-center border border-dashed border-line text-muted transition-colors hover:border-accent hover:text-ink"
            >
              + Add shop
            </Link>
          </li>
        </ul>
      )}
    </div>
  );
}
