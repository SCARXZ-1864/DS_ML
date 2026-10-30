import { scaleLinear } from "d3-scale";
import { area, line } from "d3-shape";
import type { MonthRange } from "@/lib/data/derive";
import type { MonthPoint } from "@/lib/data/schemas";
import { fmtMonth } from "@/lib/format";

// d3 does only the maths here (value → pixel, points → SVG path); React draws the SVG.

export const TL_WIDTH = 800;
export const TL_HEIGHT = 200;

export type TimelinePaths = {
  posLine: string;
  negLine: string;
  posArea: string;
  negArea: string;
  xAt: (i: number) => number;
};

const share = (p: MonthPoint, key: "pos" | "neg") => (p.count === 0 ? 0 : p[key] / p.count);
const hasReviews = (p: MonthPoint) => p.count > 0;

export function timelinePaths(monthly: MonthPoint[], width = TL_WIDTH, height = TL_HEIGHT): TimelinePaths {
  const x = scaleLinear().domain([0, Math.max(1, monthly.length - 1)]).range([0, width]);
  const y = scaleLinear().domain([0, 1]).range([height, height * 0.05]);
  const build = (key: "pos" | "neg") => {
    const ln = line<MonthPoint>().defined(hasReviews).x((_, i) => x(i)).y((p) => y(share(p, key)));
    const ar = area<MonthPoint>().defined(hasReviews).x((_, i) => x(i)).y0(height).y1((p) => y(share(p, key)));
    return { line: ln(monthly) ?? "", area: ar(monthly) ?? "" };
  };
  const pos = build("pos");
  const neg = build("neg");
  return { posLine: pos.line, negLine: neg.line, posArea: pos.area, negArea: neg.area, xAt: (i) => x(i) };
}

export function indexFromX(px: number, width: number, count: number): number {
  if (count <= 1 || width <= 0) return 0;
  const i = Math.round((px / width) * (count - 1));
  return Math.min(count - 1, Math.max(0, i));
}

export function rangeFromIndices(monthly: MonthPoint[], a: number, b: number): MonthRange {
  return { from: monthly[Math.min(a, b)].month, to: monthly[Math.max(a, b)].month };
}

export function timelineSummary(monthly: MonthPoint[]): string {
  const withReviews = monthly.filter(hasReviews);
  if (withReviews.length === 0) return "No reviews in this period.";
  const first = withReviews[0];
  const last = withReviews[withReviews.length - 1];
  const p = (pt: MonthPoint, key: "pos" | "neg") => Math.round(share(pt, key) * 100);
  return (
    `Positive share went from ${p(first, "pos")}% in ${fmtMonth(first.month)} to ${p(last, "pos")}% in ${fmtMonth(last.month)}; ` +
    `negative share went from ${p(first, "neg")}% to ${p(last, "neg")}%.`
  );
}
