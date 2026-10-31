import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CompareBars } from "@/components/compare/CompareBars";
import { ComparePicker } from "@/components/compare/ComparePicker";
import { PageHeader } from "@/components/shop/PageHeader";
import { PageSkeleton } from "@/components/shop/PageSkeleton";
import { requireUser } from "@/lib/auth/user";
import { data } from "@/lib/data";

export default function ComparePage({ searchParams }: PageProps<"/app/compare">) {
  return (
    <div className="animate-fade-rise">
      <PageHeader eyebrow="Your account" title="Compare shops">
        Each aspect&apos;s net score (% positive − % negative) for two shops. Gaps of 15 points or more are highlighted.
      </PageHeader>
      <Suspense fallback={<PageSkeleton label="Loading comparison" />}>
        <Compare searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function Compare({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const [a, b] = [one(query.a), one(query.b)];
  const user = await requireUser(`/app/compare${a && b ? `?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}` : ""}`);
  // The viewer's own shops plus the demos; anything else is "not found", whether or not it exists.
  const shops = await data.listShops(user.id);
  const picker = <ComparePicker shops={shops} a={a} b={b} />;
  if (!a || !b) return <div className="mt-6 grid gap-4">{picker}</div>;
  if (!shops.some((s) => s.id === a) || !shops.some((s) => s.id === b)) notFound();

  let body;
  if (a === b) {
    body = <p role="alert" className="text-accent">Pick two different shops.</p>;
  } else {
    const comparison = await data.compare([a, b]);
    body = comparison ? (
      <CompareBars comparison={comparison} />
    ) : (
      <p className="text-muted">One of these shops has no reviews yet, so there is nothing to compare.</p>
    );
  }
  return (
    <div className="mt-6 grid gap-4">
      {picker}
      {body}
    </div>
  );
}
