import Link from "next/link";
import { PageHeader } from "@/components/shop/PageHeader";
import type { Issue } from "@/lib/data/issues";
import type { Review, Shop } from "@/lib/data/schemas";
import { fmtInt, fmtPct } from "@/lib/format";
import { Evidence, TrendBadge, Words } from "./IssueParts";

type Props = { shop: Shop; issues: Issue[]; reviews: Review[] };

export function IssuesView({ shop, issues, reviews }: Props) {
  return (
    <div className="animate-fade-rise">
      <PageHeader eyebrow={`${shop.name} · issues`} title="Everything customers complain about">
        Every topic with at least one complaint, most complaints first. The trend compares the last three months with the
        three before.{" "}
        <Link href={`/shops/${shop.id}/fix-first`} className="text-accent underline-offset-2 hover:underline">
          See what to fix first →
        </Link>
      </PageHeader>
      {issues.length === 0 ? (
        <p className="mt-6 text-sm text-muted">No complaints found in these reviews.</p>
      ) : (
        <ol className="mt-6 grid max-w-3xl list-none gap-4 p-0">
          {issues.map((issue) => (
            <li key={issue.aspectId} className="border border-line bg-panel p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-serif text-xl">{issue.name}</h2>
                <TrendBadge change={issue.change} />
              </div>
              <p className="mt-1 text-sm text-muted">
                <span className="text-neg">
                  {fmtInt(issue.complaints)} {issue.complaints === 1 ? "complaint" : "complaints"}
                </span> · in {fmtPct(issue.reachPct)} of
                reviews · {fmtPct(issue.negPct)} of mentions are negative
              </p>
              <Words words={issue.words} />
              <Evidence issue={issue} reviews={reviews} />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
