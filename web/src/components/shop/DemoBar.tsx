import Link from "next/link";
import type { Shop } from "@/lib/data/schemas";

/** Shown on public demo shops, inviting visitors to sign up and analyse their own reviews. */
export function DemoBar({ shop }: { shop: Shop }) {
  if (!shop.isDemo) return null;
  return (
    <div role="note" className="-mx-4 flex flex-wrap items-center justify-between gap-2 bg-accent px-4 py-2 text-sm text-bg md:-mx-8 md:px-8">
      <span>You&apos;re viewing a demo shop with public reviews.</span>
      <Link href="/signup" className="font-semibold underline-offset-2 hover:underline">
        Analyse your own reviews →
      </Link>
    </div>
  );
}
