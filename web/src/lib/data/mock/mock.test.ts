import { describe, expect, it } from "vitest";
import { sliceMonths } from "../derive";
import {
  AspectSchema, OverviewSchema, ReviewPageSchema, ReviewQuerySchema, ReviewSchema, ShopSchema, TopicSchema,
} from "../schemas";
import { buildDb } from "./build";
import { mockDataSource as ds } from "./index";
import { SHOP_DEFS } from "./shops";

describe("mock data", () => {
  it("is identical every time it is built", () => {
    expect(buildDb(SHOP_DEFS)).toEqual(buildDb(SHOP_DEFS));
  });

  it("has 3 demo shops and 2 owner shops across several shop types", async () => {
    const shops = await ds.listShops();
    expect(shops.filter((s) => s.isDemo)).toHaveLength(3);
    expect(shops.filter((s) => !s.isDemo)).toHaveLength(2);
    expect(new Set(shops.map((s) => s.type))).toEqual(new Set(["restaurant", "grocery", "electronics"]));
  });

  it.each(SHOP_DEFS.map((d) => d.id))("%s follows the data contract", async (id) => {
    ShopSchema.parse(await ds.getShop(id));
    OverviewSchema.parse(await ds.getOverview(id));
    const aspects = (await ds.getAspects(id))!;
    aspects.forEach((a) => AspectSchema.parse(a));
    const reviews = await ds.getReviewsByIds(id, aspects.flatMap((a) => a.exampleReviewIds));
    expect(reviews.length).toBeGreaterThan(0);
    reviews.forEach((r) => ReviewSchema.parse(r));
  });

  it("returns null for an unknown shop", async () => {
    expect(await ds.getShop("no-such-shop")).toBeNull();
    expect(await ds.getOverview("no-such-shop")).toBeNull();
    expect(await ds.getAspects("no-such-shop")).toBeNull();
    expect(await ds.getReviewsByIds("no-such-shop", ["x"])).toEqual([]);
  });

  it("recomputes the overview for a date range", async () => {
    const full = (await ds.getOverview("freshcart"))!;
    const range = { from: full.monthly[30].month, to: full.monthly[35].month };
    const part = (await ds.getOverview("freshcart", range))!;
    expect(part.monthly).toHaveLength(6);
    expect(part.kpis.reviews).toBe(sliceMonths(full.monthly, range).reduce((s, p) => s + p.count, 0));
  });

  it("finds different aspects for different shop types", async () => {
    const names = async (id: string) => (await ds.getAspects(id))!.map((a) => a.name);
    expect(await names("freshcart")).toContain("Freshness");
    expect(await names("volthome")).toContain("Installation");
    expect(await names("volthome")).not.toContain("Freshness");
  });

  it("marks an aspect that only appears recently as new", async () => {
    const spice = (await ds.getAspects("spice-indiranagar"))!.find((a) => a.id === "spice")!;
    expect(spice.isNew).toBe(true);
    expect(spice.monthly[0].count).toBe(0);
  });

  it.each(SHOP_DEFS.map((d) => d.id))("%s has topics and paginated reviews that follow the contract", async (id) => {
    const topics = (await ds.getTopics(id))!;
    expect(topics.length).toBeGreaterThan(3);
    topics.forEach((t) => TopicSchema.parse(t));
    expect(topics.map((t) => t.size)).toEqual([...topics.map((t) => t.size)].sort((a, b) => b - a));
    const page = ReviewPageSchema.parse(await ds.getReviews(id, ReviewQuerySchema.parse({})));
    expect(page.total).toBeGreaterThanOrEqual(40);
    expect(page.items).toHaveLength(20);
  });

  it("returns null topics and reviews for an unknown shop", async () => {
    expect(await ds.getTopics("no-such-shop")).toBeNull();
    expect(await ds.getReviews("no-such-shop", ReviewQuerySchema.parse({}))).toBeNull();
  });

  it("only generates reviews for a new aspect in the months it exists", async () => {
    const page = (await ds.getReviews("spice-indiranagar", ReviewQuerySchema.parse({ aspectId: "spice", limit: 50 })))!;
    expect(page.total).toBeGreaterThan(0);
    page.items.forEach((r) => expect(r.date >= "2026-05").toBe(true));
  });
});
