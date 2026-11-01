import Link from "next/link";
import { PageHeader } from "@/components/shop/PageHeader";
import { type RankedIssue, suggestionFor } from "@/lib/data/issues";
import type { Review, Shop } from "@/lib/data/schemas";
import { fmtPct } from "@/lib/format";
import { Evidence, TrendBadge, Words } from "./IssueParts";

type Props = { shop: Shop; ranked: RankedIssue[]; reviews: Review[] };

/** One plain sentence on why the issue sits where it does. */
export function whyRanked(i: RankedIssue): string {
  const rising = i.change !== null && i.change >= 5 ? `, and complaints rose ${Math.round(i.change)} points in 3 months` : "";
  return `${fmtPct(i.reachPct)} of reviews complain about it; ${fmtPct(i.negPct)} of its mentions are negative${rising}.`;
}

export function FixFirstView({ shop, ranked, reviews }: Props) {
  return (
    <div className="animate-fade-rise">
      <PageHeader eyebrow={`${shop.name} · what to fix first`} title="What to fix first">
        Ranked by impact: how many customers raise the problem × how negative they are about it × whether it is getting
        worse. The top problem scores 100. Suggestions are starting points; the reviews under each are the evidence.
      </PageHeader>
      {ranked.length === 0 ? (
        <p className="mt-6 text-sm text-muted">Nothing to fix: no complaints found in these reviews.</p>
      ) : (
        <ol className="mt-6 grid max-w-3xl list-none gap-4 p-0">
          {ranked.map((issue, n) => (
            <li key={issue.aspectId} className="grid grid-cols-[auto_1fr] gap-4 border border-line bg-panel p-4">
              <span className="font-serif text-4xl leading-none text-accent" aria-hidden>
                {n + 1}
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-serif text-xl">
                    <span className="sr-only">Number {n + 1}: </span>
                    {issue.name}
                  </h2>
                  <TrendBadge change={issue.change} />
                </div>
                <div className="mt-2 flex items-center gap-2" role="img" aria-label={`Impact ${issue.impact} out of 100`}>
                  <span className="h-2 flex-1 bg-line">
                    <span className="block h-2 bg-neg" style={{ width: `${issue.impact}%` }} />
                  </span>
                  <span className="w-20 text-right font-mono text-xs">impact {issue.impact}</span>
                </div>
                <p className="mt-2 text-sm text-muted">{whyRanked(issue)}</p>
                <p className="mt-2 text-sm">
                  <span className="label mr-1.5">Try first</span>
                  {suggestionFor(issue.aspectId, issue.name)}
                </p>
                <Words words={issue.words} />
                <Evidence issue={issue} reviews={reviews} />
              </div>
            </li>
          ))}
        </ol>
      )}
      <p className="mt-6 text-sm">
        <Link href={`/shops/${shop.id}/issues`} className="text-accent underline-offset-2 hover:underline">
          See every issue →
        </Link>
      </p>
    </div>
  );
}
