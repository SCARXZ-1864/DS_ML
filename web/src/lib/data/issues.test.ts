import { describe, expect, it } from "vitest";
import { findIssues, rankFixFirst, suggestionFor } from "./issues";
import type { Aspect, MonthPoint } from "./schemas";

const months = (negs: number[], count = 10): MonthPoint[] =>
  negs.map((neg, i) => ({ month: `2026-${String(i + 1).padStart(2, "0")}`, count, pos: count - neg, neg, neu: 0 }));

const aspect = (id: string, name: string, monthly: MonthPoint[], extra: Partial<Aspect> = {}): Aspect => {
  const mentions = monthly.reduce((s, m) => s + m.count, 0);
  const neg = monthly.reduce((s, m) => s + m.neg, 0);
  return {
    id, name, mentions, monthly, exampleReviewIds: [`${id}-r1`],
    posPct: Math.round(((mentions - neg) * 1000) / mentions) / 10, negPct: Math.round((neg * 1000) / mentions) / 10, neuPct: 0,
    ...extra,
  };
};

// Wait: complaints rise from 2 to 6 per month. Food: many mentions, few complaints, steady. Decor: all praise.
const wait = aspect("wait-time", "Wait time", months([2, 2, 2, 6, 6, 6]), {
  reasons: [
    { text: "forty minutes", tone: "negative", count: 5, quoteReviewIds: ["w1", "w2"] },
    { text: "quick", tone: "positive", count: 3, quoteReviewIds: ["w3"] },
  ],
});
const food = aspect("food", "Food", months([3, 3, 3, 3, 3, 3], 40));
const decor = aspect("decor", "Decor", months([0, 0, 0, 0, 0, 0]));

describe("findIssues", () => {
  const issues = findIssues([food, wait, decor], 300);

  it("lists every aspect with complaints, most complaints first", () => {
    expect(issues.map((i) => i.aspectId)).toEqual(["wait-time", "food"]);
    expect(issues[0]).toMatchObject({ name: "Wait time", complaints: 24, negPct: 40, reachPct: 8 });
  });

  it("compares the last 3 months with the 3 before", () => {
    expect(issues[0].change).toBe(40); // 20% → 60% negative
    expect(issues[1].change).toBe(0);
  });

  it("gives no trend when either window has too few mentions", () => {
    const thin = aspect("x", "X", months([1, 1, 1, 1], 2));
    expect(findIssues([thin], 50)[0].change).toBeNull();
  });

  it("keeps the complaint words and the reviews that use them", () => {
    expect(issues[0].words).toEqual(["forty minutes"]);
    expect(issues[0].reviewIds).toEqual(["w1", "w2", "wait-time-r1"]);
    expect(issues[1].words).toEqual([]);
  });
});

describe("rankFixFirst", () => {
  it("ranks by reach × severity × rise, best first, scaled so the top is 100", () => {
    const ranked = rankFixFirst(findIssues([food, wait, decor], 300));
    expect(ranked.map((i) => i.aspectId)).toEqual(["wait-time", "food"]);
    expect(ranked[0].impact).toBe(100);
    expect(ranked[1].impact).toBeGreaterThan(0);
    expect(ranked[1].impact).toBeLessThan(100);
  });

  it("lets a rising problem overtake a bigger steady one", () => {
    const steadyBig = aspect("price", "Price", months([4, 4, 4, 4, 4, 4], 20)); // 24 complaints, 20%, flat
    const rising = aspect("noise", "Noise", months([1, 1, 1, 5, 6, 6], 10)); // 20 complaints, 33%, rising
    expect(rankFixFirst(findIssues([steadyBig, rising], 300)).map((i) => i.aspectId)).toEqual(["noise", "price"]);
  });

  it("returns at most the limit", () => {
    const many = Array.from({ length: 8 }, (_, i) => aspect(`a${i}`, `A${i}`, months([1, 1, 1, 1, 1, 1])));
    expect(rankFixFirst(findIssues(many, 100))).toHaveLength(5);
  });
});

describe("suggestionFor", () => {
  it("has advice for known categories and a fallback for the rest", () => {
    expect(suggestionFor("wait-time", "Wait time")).toMatch(/\w/);
    expect(suggestionFor("mystery", "Mystery")).toContain("mystery");
  });
});
