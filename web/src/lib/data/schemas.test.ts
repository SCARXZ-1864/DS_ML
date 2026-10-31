import { describe, expect, it } from "vitest";
import {
  AskRequestSchema, ChatChunkSchema, HeadlineSchema, MonthPointSchema, PredictRequestSchema, PredictionSchema,
  ReviewQuerySchema, ReviewSchema, ShopSchema, TopicSchema, UploadRequestSchema, AlertRuleSchema, ShareInputSchema,
  SignupSchema, NewShopSchema,
} from "./schemas";

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

describe("checkpoint 2 contract", () => {
  it("fills review query defaults", () => {
    expect(ReviewQuerySchema.parse({})).toEqual({ sort: "newest", limit: 20 });
  });

  it("coerces query-string numbers", () => {
    expect(ReviewQuerySchema.parse({ stars: "2", limit: "10", cursor: "40" })).toMatchObject({ stars: 2, limit: 10, cursor: "40" });
  });

  it("rejects out-of-range or unknown query values", () => {
    expect(ReviewQuerySchema.safeParse({ limit: "500" }).success).toBe(false);
    expect(ReviewQuerySchema.safeParse({ sentiment: "angry" }).success).toBe(false);
    expect(ReviewQuerySchema.safeParse({ cursor: "abc" }).success).toBe(false);
    expect(ReviewQuerySchema.safeParse({ search: "x".repeat(201) }).success).toBe(false);
  });

  it("accepts each chat chunk type and rejects unknown ones", () => {
    expect(ChatChunkSchema.parse({ type: "citation", reviewId: "r1" })).toEqual({ type: "citation", reviewId: "r1" });
    expect(ChatChunkSchema.parse({ type: "done" })).toEqual({ type: "done" });
    expect(ChatChunkSchema.safeParse({ type: "image", url: "x" }).success).toBe(false);
  });

  it("trims and limits request text", () => {
    expect(AskRequestSchema.parse({ question: "  Why?  " }).question).toBe("Why?");
    expect(AskRequestSchema.safeParse({ question: "   " }).success).toBe(false);
    expect(AskRequestSchema.safeParse({ question: "q".repeat(501) }).success).toBe(false);
    expect(PredictRequestSchema.safeParse({ text: "t".repeat(2001) }).success).toBe(false);
  });

  it("bounds prediction scores and topic shares", () => {
    const prediction = { sentiment: "positive", score: 1.5, confidence: 0.9, tokens: [], aspects: [] };
    expect(PredictionSchema.safeParse(prediction).success).toBe(false);
    const topic = { id: "t", label: "T", keywords: ["k"], size: 3, negShare: 1.2, monthly: [], representativeReviewIds: [] };
    expect(TopicSchema.safeParse(topic).success).toBe(false);
  });
});

describe("owner-area contract", () => {
  const row = { text: "Lovely food" };
  const skipped = { empty: 0, duplicate: 0, invalid: 0 };

  it("limits an upload to 5,000 rows", () => {
    expect(UploadRequestSchema.safeParse({ fileName: "a.csv", rows: Array(5000).fill(row), skipped }).success).toBe(true);
    expect(UploadRequestSchema.safeParse({ fileName: "a.csv", rows: Array(5001).fill(row), skipped }).success).toBe(false);
  });

  it("rejects an upload row whose text is blank", () => {
    expect(UploadRequestSchema.safeParse({ fileName: "a.csv", rows: [{ text: "   " }], skipped }).success).toBe(false);
  });

  it("caps an aspect-rise threshold at 50 points", () => {
    const rule = (thresholdPts: number) => ({
      id: "r-1", shopId: "s", enabled: true, kind: "aspect_rise", params: { aspectId: "x", thresholdPts },
    });
    expect(AlertRuleSchema.safeParse(rule(51)).success).toBe(false);
    expect(AlertRuleSchema.safeParse(rule(10)).success).toBe(true);
  });

  it("needs at least one section in a share link", () => {
    expect(ShareInputSchema.safeParse({ period: "30d", sections: [] }).success).toBe(false);
  });

  it("needs a signup password of at least 8 characters", () => {
    expect(SignupSchema.safeParse({ name: "A", email: "a@b.co", password: "1234567" }).success).toBe(false);
  });

  it("trims a new shop's name and rejects an empty one", () => {
    expect(NewShopSchema.parse({ name: "  Bakery  ", type: "other" }).name).toBe("Bakery");
    expect(NewShopSchema.safeParse({ name: "", type: "other" }).success).toBe(false);
  });
});
