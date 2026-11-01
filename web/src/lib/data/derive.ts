import { fmtMonth } from "@/lib/format";
import type { Aspect, Headline, Kpis, MonthPoint, Review } from "./schemas";

// Pure functions for time ranges. They are safe to import in client components
// (no data, no Node APIs), and the mock data source uses them too, so the server
// and the browser always compute the same numbers.

export type MonthRange = { from: string; to: string };

export type RangeSummary = {
  reviews: number;
  positivePct: number | null;
  negativePct: number | null;
  neutralPct: number | null;
  starMix: number[] | null;
  avgStars: number | null;
};

export type AspectRow = { id: string; name: string; mentions: number; posPct: number; negPct: number };
export type ComplaintItem = { aspectId: string; name: string; negPct: number; quote: string | null };

export const round1 = (n: number) => Math.round(n * 10) / 10;

/** Month keys are "YYYY-MM", so plain string comparison orders them correctly. */
export function fullRange(monthly: MonthPoint[]): MonthRange {
  if (monthly.length === 0) throw new Error("fullRange needs at least one month");
  return { from: monthly[0].month, to: monthly[monthly.length - 1].month };
}

export function normalizeRange(monthly: MonthPoint[], range?: Partial<MonthRange>): MonthRange {
  const all = fullRange(monthly);
  let from = range?.from ?? all.from;
  let to = range?.to ?? all.to;
  if (from > to) [from, to] = [to, from];
  from = from < all.from ? all.from : from > all.to ? all.to : from;
  to = to > all.to ? all.to : to < all.from ? all.from : to;
  return { from, to };
}

export function sliceMonths(monthly: MonthPoint[], range: MonthRange): MonthPoint[] {
  return monthly.filter((p) => p.month >= range.from && p.month <= range.to);
}

export function sameRange(a: MonthRange, b: MonthRange): boolean {
  return a.from === b.from && a.to === b.to;
}

export function lastMonths(monthly: MonthPoint[], n: number): MonthRange {
  const all = fullRange(monthly);
  return { from: monthly[Math.max(0, monthly.length - n)].month, to: all.to };
}

// Multiply first: (3 * 100) / 10 is exactly 30, while (3 / 10) * 100 is 30.000000000000004.
const pct = (part: number, whole: number) => (whole === 0 ? null : (part * 100) / whole);

export function summarize(points: MonthPoint[]): RangeSummary {
  let reviews = 0;
  let pos = 0;
  let neg = 0;
  let neu = 0;
  let stars: number[] | null = [0, 0, 0, 0, 0];
  for (const p of points) {
    reviews += p.count;
    pos += p.pos;
    neg += p.neg;
    neu += p.neu;
    if (p.stars && stars) {
      const totals = stars;
      p.stars.forEach((c, i) => {
        totals[i] += c;
      });
    } else if (p.count > 0) {
      stars = null; // a month with reviews but no ratings: star stats would be misleading
    }
  }
  const rated = stars ? stars.reduce((a, b) => a + b, 0) : 0;
  return {
    reviews,
    positivePct: pct(pos, reviews),
    negativePct: pct(neg, reviews),
    neutralPct: pct(neu, reviews),
    starMix: stars && rated > 0 ? stars : null,
    avgStars: stars && rated > 0 ? stars.reduce((sum, c, i) => sum + c * (i + 1), 0) / rated : null,
  };
}

export function toKpis(s: RangeSummary): Kpis {
  return {
    reviews: s.reviews,
    positivePct: s.positivePct === null ? null : round1(s.positivePct),
    negativePct: s.negativePct === null ? null : round1(s.negativePct),
    avgStars: s.avgStars === null ? null : Math.round(s.avgStars * 100) / 100,
  };
}

export function netScore(positivePct: number | null, negativePct: number | null): number | null {
  if (positivePct === null || negativePct === null) return null;
  return Math.round(positivePct - negativePct);
}

export function aspectInRange(a: Aspect, range: MonthRange): Aspect {
  const monthly = sliceMonths(a.monthly, range);
  const s = summarize(monthly);
  return {
    ...a,
    monthly,
    mentions: s.reviews,
    posPct: round1(s.positivePct ?? 0),
    negPct: round1(s.negativePct ?? 0),
    neuPct: round1(s.neutralPct ?? 0),
  };
}

export function aspectRows(aspects: Aspect[], range: MonthRange): AspectRow[] {
  return aspects
    .map((a) => {
      const s = summarize(sliceMonths(a.monthly, range));
      return { id: a.id, name: a.name, mentions: s.reviews, posPct: s.positivePct ?? 0, negPct: s.negativePct ?? 0 };
    })
    .filter((r) => r.mentions > 0)
    .sort((x, y) => y.mentions - x.mentions);
}

export function topComplaints(rows: AspectRow[], reviews: Review[], range: MonthRange, limit = 3): ComplaintItem[] {
  return [...rows]
    .filter((r) => r.negPct > 0)
    .sort((x, y) => y.negPct - x.negPct)
    .slice(0, limit)
    .map((r) => {
      // Only quote a review from inside the selected range; a quote from another
      // period would misrepresent what customers said in this one.
      const quote = reviews.find((rv) => {
        const month = rv.date?.slice(0, 7);
        return (
          month !== undefined &&
          month >= range.from &&
          month <= range.to &&
          rv.aspectMentions.some((m) => m.aspectId === r.id && m.sentiment === "negative")
        );
      });
      return { aspectId: r.id, name: r.name, negPct: r.negPct, quote: quote?.text ?? null };
    });
}

export function rangeHeadline(range: MonthRange, summary: RangeSummary, worstAspect: string | null): Headline {
  if (summary.reviews === 0 || summary.positivePct === null) {
    return { parts: [{ text: `No reviews between ${fmtMonth(range.from)} and ${fmtMonth(range.to)}.` }] };
  }
  const parts: Headline["parts"] = [
    { text: `From ${fmtMonth(range.from)} to ${fmtMonth(range.to)}, ` },
    { text: `${Math.round(summary.positivePct)}% of reviews were positive`, tone: "positive" },
    { text: "." },
  ];
  if (worstAspect) {
    parts.push({ text: " The biggest pain point was " }, { text: worstAspect.toLowerCase(), tone: "negative" }, { text: "." });
  }
  return { parts };
}

/** Starter questions for the Ask page, written from the shop's own aspects. */
export function suggestedQuestions(aspects: Aspect[]): string[] {
  if (aspects.length === 0) return [];
  const worst = [...aspects].sort((a, b) => b.negPct - a.negPct)[0];
  const best = [...aspects].sort((a, b) => b.posPct - a.posPct)[0];
  return [
    `Why do customers complain about ${worst.name.toLowerCase()}?`,
    "What do customers love most?",
    `How do people feel about the ${best.name.toLowerCase()}?`,
  ];
}

/** Example reviews for the "Try it" page, built from the shop's best and worst aspects. */
export function tryExamples(aspects: Aspect[]): string[] {
  if (aspects.length < 2) return ["Great service and fair prices, would recommend."];
  const best = [...aspects].sort((a, b) => b.posPct - a.posPct)[0].name.toLowerCase();
  const worst = [...aspects].sort((a, b) => b.negPct - a.negPct)[0].name.toLowerCase();
  return [
    `The ${best} was excellent but the ${worst} was terrible.`,
    `Really disappointed, the ${worst} was slow and the staff were rude.`,
    `Loved the ${best}, friendly people and great value. Would recommend!`,
  ];
}
