import { describe, expect, it } from "vitest";
import { HeadlineSchema, MonthPointSchema, ReviewSchema, ShopSchema } from "./schemas";

const point = { month: "2026-10", count: 10, pos: 7, neg: 2, neu: 1, stars: [1, 1, 1, 3, 4] };

describe("data contract", () => {
  it("accepts a valid month point", () => {
    expect(MonthPointSchema.parse(point)).toEqual(point);
  });

  it("rejects a month point whose sentiment counts don't add up", () => {
    expect(() => MonthPointSchema.parse({ ...point, neu: 5 })).toThrow(/must equal count/);
  });

  it("rejects star counts that don't add up to the review count", () => {
    expect(() => MonthPointSchema.parse({ ...point, stars: [0, 0, 0, 0, 1] })).toThrow(/add up to count/);
  });

  it("rejects a malformed month key", () => {
    expect(() => MonthPointSchema.parse({ ...point, month: "2026-13" })).toThrow(/YYYY-MM/);
  });

  it("requires at least one headline part", () => {
    expect(() => HeadlineSchema.parse({ parts: [] })).toThrow();
  });

  it("rejects an aspect mention that points outside the review text", () => {
    const review = {
      id: "r1", date: "2026-10-01", stars: 2, text: "Too slow", sentiment: "negative", confidence: 0.9,
      aspectMentions: [{ aspectId: "speed", start: 4, end: 40, sentiment: "negative" }],
    };
    expect(() => ReviewSchema.parse(review)).toThrow(/inside the text/);
  });

  it("accepts a shop without an upload date", () => {
    const shop = {
      id: "s1", name: "Corner Cafe", type: "restaurant", isDemo: true, reviewCount: 3,
      dateRange: { from: "2026-01", to: "2026-10" }, unreadAlerts: 0,
    };
    expect(ShopSchema.parse(shop).name).toBe("Corner Cafe");
  });
});
