import { describe, expect, it } from "vitest";
import type { Shop } from "@/lib/data/schemas";
import { safeNext, shopAccess, userIdForEmail } from "./access";

const shop = (isDemo: boolean): Shop => ({
  id: "s", name: "S", type: "restaurant", isDemo, reviewCount: 1, dateRange: { from: "2026-01", to: "2026-10" }, unreadAlerts: 0,
});

describe("shopAccess", () => {
  it("lets anyone see a demo shop", () => expect(shopAccess(shop(true), null, null)).toBe("ok"));
  it("sends a logged-out visitor on an owner shop to log in", () => expect(shopAccess(shop(false), "u-a", null)).toBe("login"));
  it("hides an owner shop from other users", () => expect(shopAccess(shop(false), "u-a", "u-b")).toBe("not-found"));
  it("lets the owner see their shop", () => expect(shopAccess(shop(false), "u-a", "u-a")).toBe("ok"));
  it("hides an owner shop that has no owner record", () => expect(shopAccess(shop(false), null, "u-a")).toBe("not-found"));
});

describe("safeNext", () => {
  it("keeps a path inside the app", () => expect(safeNext("/shops/a/overview")).toBe("/shops/a/overview"));
  it.each(["//evil.example", "/\\evil", "https://evil.example", "", undefined, 42, null])(
    "falls back to /app for %s",
    (next) => expect(safeNext(next)).toBe("/app"),
  );
});

describe("userIdForEmail", () => {
  it("maps the demo owner's email to the demo owner", () => expect(userIdForEmail("Owner@Demo.Test")).toBe("u-demo-owner"));
  it("derives a stable id from any other email", () => expect(userIdForEmail("A.B+c@x.io")).toBe("u-a-b-c-x-io"));
});
