"use client";

import { useMemo, useState } from "react";
import { AspectBars } from "@/components/charts/AspectBars";
import { StarDonut } from "@/components/charts/StarDonut";
import { TimelineChart } from "@/components/charts/TimelineChart";
import {
  aspectRows, fullRange, lastMonths, rangeHeadline, sameRange, sliceMonths, summarize, topComplaints,
  type MonthRange,
} from "@/lib/data/derive";
import type { Aspect, Overview, Review, Shop } from "@/lib/data/schemas";
import { fmtInt, fmtMonth, shopTypeLabel } from "@/lib/format";
import { Headline } from "./Headline";
import { KpiRow } from "./KpiRow";
import { TopComplaints } from "./TopComplaints";

type Props = { shop: Shop; overview: Overview; aspects: Aspect[]; reviews: Review[] };

export function OverviewView({ shop, overview, aspects, reviews }: Props) {
  const { monthly } = overview;
  const all = useMemo(() => fullRange(monthly), [monthly]);
  const [range, setRange] = useState<MonthRange>(all);
  const isAll = sameRange(range, all);

  const presets = useMemo(
    () => [
      { label: "All time", range: all },
      { label: "Last 12 months", range: lastMonths(monthly, 12) },
      { label: "Last 6 months", range: lastMonths(monthly, 6) },
    ],
    [all, monthly],
  );

  const baseline = useMemo(() => summarize(monthly), [monthly]);
  const summary = useMemo(() => summarize(sliceMonths(monthly, range)), [monthly, range]);
  const rows = useMemo(() => aspectRows(aspects, range), [aspects, range]);
  const complaints = useMemo(() => topComplaints(rows, reviews, range), [rows, reviews, range]);
  const headline = isAll ? overview.headline : rangeHeadline(range, summary, complaints[0]?.name ?? null);
  const empty = summary.reviews === 0;

  return (
    <div className="animate-fade-rise">
      <header className="border-b border-line pb-4 pt-6">
        <p className="label">
          {shopTypeLabel(shop.type)} · {fmtInt(shop.reviewCount)} reviews · {fmtMonth(all.from)} – {fmtMonth(all.to)}
        </p>
        <h1 className="mt-1 font-serif text-3xl">{shop.name}</h1>
      </header>

      <Headline headline={headline} className="mt-5 max-w-3xl" />

      <KpiRow summary={summary} baseline={isAll ? undefined : baseline} />

      <div className="mt-6 flex flex-wrap items-center gap-2" role="group" aria-label="Time range">
        {presets.map((p) => (
          <button
            key={p.label}
            type="button"
            aria-pressed={sameRange(range, p.range)}
            onClick={() => setRange(p.range)}
            className="border border-line bg-panel px-3 py-1 text-sm transition-colors hover:border-accent aria-pressed:border-accent aria-pressed:bg-accent aria-pressed:text-bg"
          >
            {p.label}
          </button>
        ))}
        <span className="ml-2 font-mono text-xs text-muted">
          {fmtMonth(range.from)} → {fmtMonth(range.to)}
        </span>
      </div>

      <section className="mt-3" aria-label="Sentiment over time">
        <p className="label mb-1">Sentiment over time · drag across the chart to pick a range, double-click to reset</p>
        <TimelineChart monthly={monthly} range={range} onRangeChange={setRange} />
      </section>

      {empty ? (
        <div className="mt-8 border border-dashed border-line p-6 text-center">
          <p>Nothing to show for this range.</p>
          <button
            type="button"
            onClick={() => setRange(all)}
            className="mt-3 border border-accent px-3 py-1 text-sm text-accent hover:bg-accent hover:text-bg"
          >
            Show all time
          </button>
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1.3fr_1fr]">
          <section aria-labelledby="aspects-heading">
            <h2 id="aspects-heading" className="label mb-3">What customers rate this shop on · net score</h2>
            <AspectBars rows={rows} />
            <p className="mt-3 border-l-2 border-info pl-2 text-xs text-muted">
              These aspects were discovered from the reviews, not picked from a list.
            </p>
          </section>
          <div className="grid content-start gap-8">
            <section aria-labelledby="stars-heading">
              <h2 id="stars-heading" className="label mb-3">Star rating mix</h2>
              <StarDonut starMix={summary.starMix} avgStars={summary.avgStars} />
            </section>
            <section aria-labelledby="complaints-heading">
              <h2 id="complaints-heading" className="label mb-3">Top complaints</h2>
              <TopComplaints items={complaints} />
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
