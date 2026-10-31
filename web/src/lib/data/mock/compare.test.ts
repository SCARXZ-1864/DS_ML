import { beforeEach, describe, expect, it } from "vitest";
import { ComparisonSchema } from "../schemas";
import { mockDataSource as ds } from "./index";
import { resetStore } from "./store";

beforeEach(() => resetStore());

describe("compare", () => {
  it("lines up aspects two restaurants share in one row each", async () => {
    const c = (await ds.compare(["saffron-table", "spice-indiranagar"]))!;
    ComparisonSchema.parse(c);
    const names = c.rows.map((r) => r.name.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
    const food = c.rows.find((r) => r.name === "Food")!;
    expect(food.net.every((n) => n !== null)).toBe(true);
    expect(c.shops.map((s) => s.id)).toEqual(["saffron-table", "spice-indiranagar"]);
  });

  it("leaves a gap where a shop doesn't have the aspect", async () => {
    const c = (await ds.compare(["saffron-table", "volthome"]))!;
    expect(c.rows.find((r) => r.name === "Food")?.net[1]).toBeNull();
  });

  it("puts the biggest gaps first", async () => {
    const c = (await ds.compare(["saffron-table", "spice-indiranagar"]))!;
    const gaps = c.rows.filter((r) => r.net.every((n) => n !== null)).map((r) => Math.abs(r.net[0]! - r.net[1]!));
    expect(gaps).toEqual([...gaps].sort((a, b) => b - a));
  });

  it("can't compare a shop without reviews", async () => {
    await ds.createShop("u-x", { name: "Empty", type: "other" });
    expect(await ds.compare(["saffron-table", "empty"])).toBeNull();
  });
});
