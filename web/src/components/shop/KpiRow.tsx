"use client";

import { useCountUp } from "@/components/motion/useCountUp";
import type { RangeSummary } from "@/lib/data/derive";
import { fmtInt, fmtPct, fmtStars } from "@/lib/format";

type Tint = "info" | "pos" | "neg" | "accent";
const CELL: Record<Tint, string> = { info: "bg-info/10", pos: "bg-pos/10", neg: "bg-neg/10", accent: "bg-accent/10" };
const VALUE: Record<Tint, string> = { info: "text-ink", pos: "text-pos", neg: "text-neg", accent: "text-accent" };

type Change = { text: string; good: boolean } | null;

function change(current: number | null, base: number | null | undefined, unit: "pts" | "", higherIsBetter: boolean, min: number): Change {
  if (current === null || base === null || base === undefined) return null;
  const d = current - base;
  if (Math.abs(d) < min) return null;
  const size = unit === "pts" ? `${Math.abs(d).toFixed(1)} pts` : Math.abs(d).toFixed(2);
  return { text: `${d > 0 ? "▲" : "▼"} ${size}`, good: higherIsBetter ? d > 0 : d < 0 };
}

type KpiProps = { label: string; value: number | null; format: (v: number) => string; tint: Tint; delta: Change };

function Kpi({ label, value, format, tint, delta }: KpiProps) {
  const shown = useCountUp(value ?? 0);
  return (
    <div className={`border-line px-3.5 py-3 not-last:border-r ${CELL[tint]}`}>
      <dt className="label">{label}</dt>
      <dd className={`m-0 font-mono text-2xl ${VALUE[tint]}`}>{value === null ? "—" : format(shown)}</dd>
      <dd className={`m-0 h-4 font-mono text-[11.5px] ${delta ? (delta.good ? "text-pos" : "text-neg") : ""}`}>
        {delta ? `${delta.text} vs all time` : ""}
      </dd>
    </div>
  );
}

type Props = { summary: RangeSummary; baseline?: RangeSummary };

export function KpiRow({ summary, baseline: b }: Props) {
  return (
    <>
      <dl className="mt-5 grid grid-cols-2 border border-line md:grid-cols-4">
        <Kpi label="Reviews" value={summary.reviews} format={fmtInt} tint="info" delta={null} />
        <Kpi label="Positive" value={summary.positivePct} format={(v) => fmtPct(v)} tint="pos"
          delta={b ? change(summary.positivePct, b.positivePct, "pts", true, 0.05) : null} />
        <Kpi label="Negative" value={summary.negativePct} format={(v) => fmtPct(v)} tint="neg"
          delta={b ? change(summary.negativePct, b.negativePct, "pts", false, 0.05) : null} />
        <Kpi label="Avg stars" value={summary.avgStars} format={fmtStars} tint="accent"
          delta={b ? change(summary.avgStars, b.avgStars, "", true, 0.005) : null} />
      </dl>
      {/* Announces the final numbers once, instead of every count-up frame. */}
      <p className="sr-only" aria-live="polite">
        {`${fmtInt(summary.reviews)} reviews, ${fmtPct(summary.positivePct)} positive, ${fmtPct(summary.negativePct)} negative, average stars ${fmtStars(summary.avgStars)}.`}
      </p>
    </>
  );
}
