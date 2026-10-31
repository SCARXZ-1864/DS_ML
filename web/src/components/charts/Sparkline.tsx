import { scaleLinear } from "d3-scale";
import { line } from "d3-shape";

const STROKE = { positive: "stroke-pos", negative: "stroke-neg", neutral: "stroke-accent" } as const;

/** A tiny trend line with no axes. Decorative, so hidden from screen readers. */
export function Sparkline({ values, tone }: { values: number[]; tone: keyof typeof STROKE }) {
  if (values.length < 2) return null;
  const x = scaleLinear().domain([0, values.length - 1]).range([0, 300]);
  const y = scaleLinear().domain([0, Math.max(1, ...values)]).range([58, 4]);
  const d = line<number>().x((_, i) => x(i)).y((v) => y(v))(values) ?? "";
  return (
    <svg aria-hidden viewBox="0 0 300 60" preserveAspectRatio="none" className="h-14 w-full">
      <path d={d} className={`fill-none ${STROKE[tone]}`} strokeWidth={2} />
    </svg>
  );
}
