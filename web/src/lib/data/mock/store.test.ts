import { beforeEach, describe, expect, it } from "vitest";
import { AspectSchema, OverviewSchema, ShopSchema, TopicSchema } from "../schemas";
import { mockDataSource as ds } from "./index";
import { attachData, resetStore } from "./store";

beforeEach(() => resetStore());

describe("mock owner store", () => {
  it("shows a logged-out visitor only the demo shops", async () => {
    const shops = await ds.listShops(null);
    expect(shops).toHaveLength(3);
    expect(shops.every((s) => s.isDemo)).toBe(true);
  });

  it("adds the demo owner's two shops to the list", async () => {
    expect(await ds.listShops("u-demo-owner")).toHaveLength(5);
    expect(await ds.getShopOwner("spice-indiranagar")).toBe("u-demo-owner");
    expect(await ds.getShopOwner("saffron-table")).toBeNull();
  });

  it("creates an empty shop with a unique id from its name", async () => {
    const shop = await ds.createShop("u-x", { name: "Corner Bakery", type: "other" });
    expect(shop).toMatchObject({ id: "corner-bakery", reviewCount: 0, isDemo: false, unreadAlerts: 0 });
    ShopSchema.parse(shop);
    expect(await ds.getShopOwner("corner-bakery")).toBe("u-x");
    expect((await ds.createShop("u-x", { name: "Corner Bakery", type: "other" })).id).toBe("corner-bakery-2");
    expect((await ds.listShops("u-x")).map((s) => s.id)).toContain("corner-bakery");
  });

  it("has no analytics for a shop with no reviews yet", async () => {
    await ds.createShop("u-x", { name: "Corner Bakery", type: "other" });
    expect(await ds.getOverview("corner-bakery")).toBeNull();
    expect(await ds.getAspects("corner-bakery")).toBeNull();
    expect(await ds.getReviews("corner-bakery", { sort: "newest", limit: 20 })).toEqual({ items: [], nextCursor: null, total: 0 });
  });

  it("fills a shop with data that fits its type and keeps its name", async () => {
    await ds.createShop("u-x", { name: "Corner Bakery", type: "other" });
    attachData("corner-bakery");
    const shop = (await ds.getShop("corner-bakery"))!;
    expect(shop.name).toBe("Corner Bakery");
    expect(shop.reviewCount).toBeGreaterThan(0);
    const aspects = (await ds.getAspects("corner-bakery"))!;
    expect(aspects.length).toBeGreaterThan(0);
    expect(aspects.map((a) => a.name)).not.toContain("Food");
    aspects.forEach((a) => AspectSchema.parse(a));
    OverviewSchema.parse(await ds.getOverview("corner-bakery"));
    (await ds.getTopics("corner-bakery"))!.forEach((t) => TopicSchema.parse(t));
    expect(await ds.getShopOwner("corner-bakery")).toBe("u-x");
  });

  it("stores users and seeds the demo owner", async () => {
    expect(await ds.getUser("u-demo-owner")).toMatchObject({ email: "owner@demo.test", name: "Demo owner" });
    await ds.saveUser({ id: "u-x", name: "X", email: "x@y.io", alertEmail: "x@y.io" });
    expect((await ds.getUser("u-x"))?.name).toBe("X");
  });
});
