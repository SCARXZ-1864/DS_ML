import { describe, expect, it } from "vitest";
import type { Shop } from "@/lib/data/schemas";
import { uploadTarget } from "./target";

const shop = (id: string, isDemo = false): Shop => ({
  id, name: id, type: "restaurant", isDemo, reviewCount: 0, dateRange: { from: "2026-01", to: "2026-01" }, unreadAlerts: 0,
});

describe("uploadTarget", () => {
  it("asks a visitor to log in, then comes back here", () => {
    expect(uploadTarget(null, [shop("demo", true)])).toBe("/login?next=%2Fupload");
  });

  it("starts a new shop when the owner has none (demo shops do not count)", () => {
    expect(uploadTarget("u1", [shop("demo", true)])).toBe("/app/shops/new");
  });

  it("goes straight to the upload screen of an owner's only shop", () => {
    expect(uploadTarget("u1", [shop("demo", true), shop("mine")])).toBe("/shops/mine/uploads/new");
  });

  it("lets an owner with several shops choose", () => {
    expect(uploadTarget("u1", [shop("a"), shop("b")])).toBeNull();
  });
});
