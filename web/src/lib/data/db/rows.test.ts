import { describe, expect, it } from "vitest";
import { AspectSchema, OverviewSchema, ReviewSchema, ShopSchema } from "../schemas";
import { toAspect, toOverview, toReview, toShop, type AspectRow, type MonthRow, type ReviewRow, type ShopRow } from "./rows";

const shopRow: ShopRow = {
  id: "saffron-table", name: "Saffron Table", type: "restaurant", is_demo: true, owner_id: null, review_count: 3,
  date_from: "2026-01", date_to: "2026-03", last_upload_at: null,
  headline: { parts: [{ text: "Customers love the " }, { text: "food", tone: "positive" }, { text: "." }] },
  top_complaints: [{ aspectId: "wait", negPct: 70, quoteReviewId: "r2" }],
};
const months: MonthRow[] = [
  { month: "2026-01", count: 1, pos: 1, neg: 0, neu: 0, stars: [0, 0, 0, 1, 0] },
  { month: "2026-03", count: 2, pos: 0, neg: 1, neu: 1, stars: [1, 0, 1, 0, 0] },
];

describe("database rows → data contract", () => {
  it("maps a shop row", () => {
    const shop = ShopSchema.parse(toShop(shopRow));
    expect(shop).toEqual({
      id: "saffron-table", name: "Saffron Table", type: "restaurant", isDemo: true, reviewCount: 3,
      dateRange: { from: "2026-01", to: "2026-03" }, unreadAlerts: 0,
    });
  });

  it("gives a shop with no reviews this month as its range", () => {
    const shop = toShop({ ...shopRow, date_from: null, date_to: null, last_upload_at: "2026-10-02" }, new Date("2026-11-02"));
    expect(shop.dateRange).toEqual({ from: "2026-11", to: "2026-11" });
    expect(shop.lastUploadAt).toBe("2026-10-02");
  });

  it("builds the overview from the shop and its months", () => {
    const o = OverviewSchema.parse(toOverview(shopRow, months));
    expect(o.kpis).toEqual({ reviews: 3, positivePct: 33.3, negativePct: 33.3, avgStars: 2.67 });
    expect(o.starMix).toEqual([1, 0, 1, 1, 0]);
    expect(o.topComplaints).toEqual(shopRow.top_complaints);
    expect(o.headline).toEqual(shopRow.headline);
  });

  it("drops star counts from months without ratings", () => {
    const o = toOverview(shopRow, [{ ...months[0], stars: null }]);
    expect(o.monthly[0].stars).toBeNull();
    expect(o.starMix).toBeNull();
  });

  it("maps an aspect row", () => {
    const row: AspectRow = {
      id: "wait", name: "Wait time", grp: null, is_new: true, mentions: 6, pos_pct: 10, neg_pct: 70, neu_pct: 20,
      monthly: [{ month: "2026-03", count: 6, pos: 1, neg: 4, neu: 1, stars: null }], example_review_ids: ["r2"],
    };
    expect(AspectSchema.parse(toAspect(row))).toEqual({
      id: "wait", name: "Wait time", isNew: true, mentions: 6, posPct: 10, negPct: 70, neuPct: 20,
      monthly: [{ month: "2026-03", count: 6, pos: 1, neg: 4, neu: 1, stars: null }], exampleReviewIds: ["r2"],
    });
    expect(toAspect({ ...row, grp: "service", is_new: false })).toMatchObject({ group: "service" });
    expect(toAspect({ ...row, is_new: false })).not.toHaveProperty("isNew");
  });

  it("maps a review row, keeping a missing date", () => {
    const row: ReviewRow = {
      id: "r2", date: null, stars: null, text: "Waited an hour.", sentiment: "negative", confidence: 0.91,
      aspect_mentions: [{ aspectId: "wait", start: 0, end: 6, sentiment: "negative" }],
    };
    expect(ReviewSchema.parse(toReview(row))).toEqual({
      id: "r2", date: null, stars: null, text: "Waited an hour.", sentiment: "negative", confidence: 0.91,
      aspectMentions: [{ aspectId: "wait", start: 0, end: 6, sentiment: "negative" }],
    });
  });
});
