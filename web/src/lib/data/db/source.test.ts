import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { AspectSchema, OverviewSchema, ReviewQuerySchema, ReviewSchema, ShopSchema } from "../schemas";
import { createDbReads } from "./source";

// Reads the real Supabase project (the demo shops loaded by pipeline/scripts/load_demo_shops.py).
// Skipped unless SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set, here or in the repo's .env.
function env(name: string): string | undefined {
  if (process.env[name]) return process.env[name];
  try {
    const line = readFileSync(new URL("../../../../../.env", import.meta.url), "utf8")
      .split(/\r?\n/)
      .find((l) => l.startsWith(`${name}=`));
    return line?.slice(name.length + 1).trim() || undefined;
  } catch {
    return undefined;
  }
}
const url = env("SUPABASE_URL");
const key = env("SUPABASE_SERVICE_ROLE_KEY");
const db = url && key ? createDbReads(createClient(url, key, { auth: { persistSession: false } })) : null;
const q = (input: Record<string, unknown> = {}) => ReviewQuerySchema.parse(input);

describe.skipIf(!db)("Supabase reads (live)", () => {
  const reads = db!;

  it("lists the three demo shops in the contract's shape", async () => {
    const shops = await reads.listDemoShops();
    expect(shops.map((s) => s.id).sort()).toEqual(["freshcart", "saffron-table", "volthome"]);
    shops.forEach((s) => ShopSchema.parse(s));
    expect(await reads.getShop("no-such-shop")).toBeNull();
    expect(await reads.getShopOwner("saffron-table")).toBeNull();
  });

  it("returns a valid overview and aspects", async () => {
    const o = OverviewSchema.parse(await reads.getOverview("saffron-table"));
    expect(o.kpis.reviews).toBeGreaterThan(100);
    const aspects = (await reads.getAspects("saffron-table"))!;
    expect(aspects.length).toBeGreaterThan(2);
    aspects.forEach((a) => AspectSchema.parse(a));
    expect(aspects[0].mentions).toBeGreaterThanOrEqual(aspects.at(-1)!.mentions);
  });

  it("pages, filters and sorts reviews", async () => {
    const first = (await reads.getReviews("saffron-table", q({ limit: 10 })))!;
    first.items.forEach((r) => ReviewSchema.parse(r));
    expect(first.items).toHaveLength(10);
    expect(first.nextCursor).toBe("10");
    const dates = first.items.map((r) => r.date!);
    expect([...dates].sort().reverse()).toEqual(dates);

    const second = (await reads.getReviews("saffron-table", q({ limit: 10, cursor: "10" })))!;
    expect(second.items.map((r) => r.id)).not.toContain(first.items[0].id);

    const neg = (await reads.getReviews("saffron-table", q({ sentiment: "negative", stars: 1 })))!;
    expect(neg.items.every((r) => r.sentiment === "negative" && r.stars === 1)).toBe(true);
    expect(neg.total).toBeLessThan(first.total);

    const aspectId = (await reads.getAspects("saffron-table"))![0].id;
    const about = (await reads.getReviews("saffron-table", q({ aspectId })))!;
    expect(about.total).toBeGreaterThan(0);
    expect(about.items.every((r) => r.aspectMentions.some((m) => m.aspectId === aspectId))).toBe(true);

    const lowest = (await reads.getReviews("saffron-table", q({ sort: "lowest" })))!;
    expect(lowest.items[0].stars).toBe(1);
  });

  it("finds reviews by word and by id", async () => {
    const found = (await reads.getReviews("saffron-table", q({ search: "biryani" })))!;
    expect(found.total).toBeGreaterThan(0);
    expect(found.items.every((r) => /biryani/i.test(r.text))).toBe(true);
    const ids = found.items.slice(0, 2).map((r) => r.id).reverse();
    expect((await reads.getReviewsByIds("saffron-table", ids)).map((r) => r.id)).toEqual(ids);
    expect(await reads.getReviews("no-such-shop", q())).toBeNull();
  });
});
