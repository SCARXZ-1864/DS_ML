import { describe, expect, it } from "vitest";
import {
  aspectRows, fullRange, lastMonths, netScore, normalizeRange, rangeHeadline, sliceMonths, suggestedQuestions,
  summarize, toKpis, topComplaints,
} from "./derive";
import type { Aspect, MonthPoint, Review } from "./schemas";

const mp = (month: string, count: number, pos: number, neg: number, stars: number[] | null = null): MonthPoint => ({
  month, count, pos, neg, neu: count - pos - neg, stars,
});
const series = [
  mp("2026-01", 10, 7, 2, [1, 1, 1, 3, 4]),
  mp("2026-02", 0, 0, 0, [0, 0, 0, 0, 0]),
  mp("2026-03", 20, 10, 8, [5, 3, 2, 4, 6]),
];

describe("ranges", () => {
  it("covers the whole series by default", () => {
    expect(fullRange(series)).toEqual({ from: "2026-01", to: "2026-03" });
    expect(normalizeRange(series)).toEqual({ from: "2026-01", to: "2026-03" });
  });
  it("puts a reversed range in order", () => {
    expect(normalizeRange(series, { from: "2026-03", to: "2026-01" })).toEqual({ from: "2026-01", to: "2026-03" });
  });
  it("clamps a range to the months that exist", () => {
    expect(normalizeRange(series, { from: "2020-01", to: "2030-12" })).toEqual({ from: "2026-01", to: "2026-03" });
  });
  it("builds 'last N months' presets", () => {
    expect(lastMonths(series, 2)).toEqual({ from: "2026-02", to: "2026-03" });
    expect(lastMonths(series, 99)).toEqual({ from: "2026-01", to: "2026-03" });
  });
});

describe("summarize", () => {
  it("adds counts and computes percentages and stars", () => {
    const s = summarize(series);
    expect(s.reviews).toBe(30);
    expect(s.positivePct).toBeCloseTo(56.667, 2);
    expect(s.negativePct).toBeCloseTo(33.333, 2);
    expect(s.starMix).toEqual([6, 4, 3, 7, 10]);
    expect(s.avgStars).toBeCloseTo(101 / 30, 5);
  });
  it("returns nulls, never NaN, for a range with zero reviews", () => {
    expect(summarize(sliceMonths(series, { from: "2026-02", to: "2026-02" }))).toEqual({
      reviews: 0, positivePct: null, negativePct: null, neutralPct: null, starMix: null, avgStars: null,
    });
  });
  it("drops star stats when a month with reviews has no ratings", () => {
    const s = summarize([mp("2026-01", 10, 7, 2, null), mp("2026-02", 5, 3, 1, [0, 1, 1, 1, 2])]);
    expect(s.reviews).toBe(15);
    expect(s.starMix).toBeNull();
    expect(s.avgStars).toBeNull();
  });
  it("rounds KPIs for display", () => {
    expect(toKpis(summarize(series))).toEqual({ reviews: 30, positivePct: 56.7, negativePct: 33.3, avgStars: 3.37 });
  });
  it("computes a net score only when both sides are known", () => {
    expect(netScore(72.4, 10.1)).toBe(62);
    expect(netScore(null, 10)).toBeNull();
  });
});

const aspect = (id: string, name: string, monthly: MonthPoint[]): Aspect => ({
  id, name, mentions: 0, posPct: 0, negPct: 0, neuPct: 0, monthly, exampleReviewIds: [],
});
const review = (id: string, date: string, aspectId: string, sentiment: Review["sentiment"]): Review => ({
  id, date, stars: 2, text: `${id} about ${aspectId}`, sentiment, confidence: 0.9,
  aspectMentions: [{ aspectId, start: 0, end: 4, sentiment }],
});

describe("aspects and complaints", () => {
  const aspects = [
    aspect("wait", "Wait time", [mp("2026-01", 4, 1, 3), mp("2026-02", 0, 0, 0), mp("2026-03", 6, 2, 3)]),
    aspect("food", "Food", [mp("2026-01", 9, 8, 1), mp("2026-02", 0, 0, 0), mp("2026-03", 11, 9, 1)]),
    aspect("music", "Music", [mp("2026-01", 0, 0, 0), mp("2026-02", 0, 0, 0), mp("2026-03", 0, 0, 0)]),
  ];
  const range = fullRange(series);

  it("summarises each aspect for the range, drops unmentioned ones and sorts by mentions", () => {
    const rows = aspectRows(aspects, range);
    expect(rows.map((r) => r.id)).toEqual(["food", "wait"]);
    expect(rows[1]).toEqual({ id: "wait", name: "Wait time", mentions: 10, posPct: 30, negPct: 60 });
  });

  it("ranks complaints by negative share and prefers a quote from inside the range", () => {
    const reviews = [review("old", "2025-06-01", "wait", "negative"), review("new", "2026-03-04", "wait", "negative")];
    const items = topComplaints(aspectRows(aspects, range), reviews, range);
    expect(items[0]).toEqual({ aspectId: "wait", name: "Wait time", negPct: 60, quote: "new about wait" });
    expect(items[1].quote).toBeNull();
  });

  it("never shows a quote from outside the selected range", () => {
    const reviews = [review("old", "2025-06-01", "wait", "negative")];
    const items = topComplaints(aspectRows(aspects, range), reviews, range);
    expect(items.find((i) => i.aspectId === "wait")?.quote).toBeNull();
  });

  it("writes a range headline as structured parts", () => {
    const h = rangeHeadline({ from: "2026-01", to: "2026-03" }, summarize(series), "Wait time");
    expect(h.parts.map((p) => p.text).join("")).toBe(
      "From Jan 2026 to Mar 2026, 57% of reviews were positive. The biggest pain point was wait time.",
    );
    expect(h.parts.find((p) => p.tone === "negative")?.text).toBe("wait time");
  });

  it("says plainly when a range has no reviews", () => {
    const h = rangeHeadline({ from: "2026-02", to: "2026-02" }, summarize([series[1]]), null);
    expect(h.parts).toEqual([{ text: "No reviews between Feb 2026 and Feb 2026." }]);
  });
});

describe("suggestedQuestions", () => {
  it("builds questions from the shop's own aspects", () => {
    const aspects = [
      { ...aspect("wait", "Wait time", []), posPct: 20, negPct: 60 },
      { ...aspect("food", "Food", []), posPct: 85, negPct: 5 },
    ];
    expect(suggestedQuestions(aspects)).toEqual([
      "Why do customers complain about wait time?",
      "What do customers love most?",
      "How do people feel about the food?",
    ]);
    expect(suggestedQuestions([])).toEqual([]);
  });
});
