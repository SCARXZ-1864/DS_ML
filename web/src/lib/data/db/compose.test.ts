import { beforeEach, describe, expect, it } from "vitest";
import { mockDataSource } from "../mock";
import { DEMO_OWNER, resetStore } from "../mock/store";
import { ReviewQuerySchema, type Aspect, type ChatChunk, type Overview, type Review, type Shop } from "../schemas";
import { withDatabase, type DbReads } from "./compose";

const shop: Shop = {
  id: "db-cafe", name: "DB Cafe", type: "restaurant", isDemo: true, reviewCount: 3,
  dateRange: { from: "2026-01", to: "2026-03" }, unreadAlerts: 0,
};
const months = [
  { month: "2026-01", count: 1, pos: 1, neg: 0, neu: 0, stars: [0, 0, 0, 0, 1] },
  { month: "2026-02", count: 1, pos: 0, neg: 1, neu: 0, stars: [1, 0, 0, 0, 0] },
  { month: "2026-03", count: 1, pos: 0, neg: 1, neu: 0, stars: [0, 1, 0, 0, 0] },
];
const overview: Overview = {
  shopId: "db-cafe", headline: { parts: [{ text: "Hi." }] }, kpis: { reviews: 3, positivePct: 33.3, negativePct: 66.7, avgStars: 2.67 },
  monthly: months, starMix: [1, 1, 0, 0, 1], topComplaints: [],
};
const aspects: Aspect[] = [
  {
    id: "service", name: "Service", mentions: 2, posPct: 50, negPct: 50, neuPct: 0, exampleReviewIds: ["r1", "r2"],
    monthly: [
      { month: "2026-01", count: 1, pos: 1, neg: 0, neu: 0 },
      { month: "2026-03", count: 1, pos: 0, neg: 1, neu: 0 },
    ],
  },
];
const reviews: Review[] = [
  { id: "r1", date: "2026-01-04", stars: 5, text: "Service was great.", sentiment: "positive", confidence: 0.9, aspectMentions: [{ aspectId: "service", start: 0, end: 7, sentiment: "positive" }] },
  { id: "r2", date: "2026-03-01", stars: 2, text: "Service was slow.", sentiment: "negative", confidence: 0.8, aspectMentions: [{ aspectId: "service", start: 0, end: 7, sentiment: "negative" }] },
];

const known = (id: string) => id === shop.id;
const fakeDb: DbReads = {
  async listDemoShops() { return [shop]; },
  async getShop(id) { return known(id) ? shop : null; },
  async getShopOwner() { return null; },
  async getOverview(id) { return known(id) ? overview : null; },
  async getAspects(id) { return known(id) ? aspects : null; },
  async getReviewsByIds(id, ids) { return known(id) ? reviews.filter((r) => ids.includes(r.id)) : []; },
  async getReviews(id) { return known(id) ? { items: reviews, nextCursor: null, total: 2 } : null; },
};
const ds = withDatabase(mockDataSource, fakeDb);

beforeEach(() => resetStore());

describe("withDatabase", () => {
  it("lists demo shops from the database and owner shops from the mock store", async () => {
    expect((await ds.listShops(null)).map((s) => s.id)).toEqual(["db-cafe"]);
    const ids = (await ds.listShops(DEMO_OWNER.id)).map((s) => s.id);
    expect(ids).toEqual(["db-cafe", "spice-indiranagar", "spice-koramangala"]);
  });

  it("reads database shops from the database and hides the mock's demo shops", async () => {
    expect((await ds.getShop("db-cafe"))?.name).toBe("DB Cafe");
    expect(await ds.getShop("saffron-table")).toBeNull();
    expect(await ds.getOverview("saffron-table")).toBeNull();
  });

  it("keeps owner shops in the mock store", async () => {
    expect((await ds.getShop("spice-indiranagar"))?.isDemo).toBe(false);
    expect(await ds.getShopOwner("spice-indiranagar")).toBe(DEMO_OWNER.id);
    expect((await ds.getOverview("spice-indiranagar"))?.shopId).toBe("spice-indiranagar");
  });

  it("applies a date range to database shops", async () => {
    const o = (await ds.getOverview("db-cafe", { from: "2026-02", to: "2026-03" }))!;
    expect(o.kpis.reviews).toBe(2);
    expect(o.monthly.map((m) => m.month)).toEqual(["2026-02", "2026-03"]);
    const [service] = (await ds.getAspects("db-cafe", { from: "2026-02" }))!;
    expect(service).toMatchObject({ mentions: 1, negPct: 100 });
  });

  it("derives topics, answers and predictions from database aspects and reviews", async () => {
    const topics = (await ds.getTopics("db-cafe"))!;
    expect(topics.map((t) => t.representativeReviewIds)).toEqual([["r1", "r2"]]);
    const chunks: ChatChunk[] = [];
    for await (const c of (await ds.ask("db-cafe", "What about service?"))!) chunks.push(c);
    expect(chunks.at(-1)).toEqual({ type: "done" });
    expect(chunks.some((c) => c.type === "citation")).toBe(true);
    expect((await ds.predict("db-cafe", "The service was rude"))?.sentiment).toBeDefined();
  });

  it("returns null topics, answers and predictions for an unknown shop", async () => {
    expect(await ds.getTopics("nope")).toBeNull();
    expect(await ds.ask("nope", "Hi?")).toBeNull();
    expect(await ds.predict("nope", "Hi")).toBeNull();
    expect(await ds.getReviews("nope", ReviewQuerySchema.parse({}))).toBeNull();
  });

  it("compares a database shop with an owner shop", async () => {
    const c = (await ds.compare(["db-cafe", "spice-indiranagar"]))!;
    expect(c.shops.map((s) => s.id)).toEqual(["db-cafe", "spice-indiranagar"]);
    expect(c.rows.find((r) => r.name === "Service")?.net[0]).toBe(0);
    expect(await ds.compare(["db-cafe", "nope"])).toBeNull();
  });
});
