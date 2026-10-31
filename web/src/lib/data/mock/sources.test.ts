import { beforeEach, describe, expect, it } from "vitest";
import { GoogleLocationSchema, SourceSchema } from "../schemas";
import { mockDataSource as ds } from "./index";
import { connectGoogleAt, disconnectSourceAt, listGoogleLocations, listSourcesAt, syncSourceAt } from "./sources";
import { resetStore } from "./store";

const T0 = Date.parse("2026-10-31T10:00:00Z");

beforeEach(() => resetStore());

describe("review sources", () => {
  it("starts the sample owner shop with a connected Google profile", () => {
    const [google] = listSourcesAt("spice-indiranagar", T0);
    expect(google).toMatchObject({ kind: "google", status: "connected", locationName: "Spice Route · Indiranagar", reviewsImported: 1240 });
    SourceSchema.parse(google);
  });

  it("offers three locations, the first named after the shop", () => {
    const locations = listGoogleLocations("spice-koramangala");
    expect(locations.map((l) => l.name)).toEqual([
      "Spice Route · Koramangala",
      "Spice Route · Koramangala · Second branch",
      "Spice Route · Koramangala · Kiosk",
    ]);
    locations.forEach((l) => GoogleLocationSchema.parse(l));
  });

  it("syncs for 6 seconds after connecting, then reports connected", () => {
    const src = connectGoogleAt("spice-koramangala", { locationId: "loc-2", accountLabel: "owner@demo.test" }, T0);
    expect(src).toMatchObject({ status: "syncing", locationName: "Spice Route · Koramangala · Second branch" });
    const later = listSourcesAt("spice-koramangala", T0 + 7000).find((s) => s.kind === "google")!;
    expect(later.status).toBe("connected");
    expect(later.lastSyncAt).toBe("2026-10-31T10:00:06.000Z");
    SourceSchema.parse(later);
  });

  it("fills an empty shop with reviews on its first sync", async () => {
    await ds.createShop("u-x", { name: "Corner Bakery", type: "grocery" });
    connectGoogleAt("corner-bakery", { locationId: "loc-1", accountLabel: "x@y.io" }, T0);
    const [google] = listSourcesAt("corner-bakery", T0 + 7000);
    const shop = (await ds.getShop("corner-bakery"))!;
    expect(shop.reviewCount).toBeGreaterThan(0);
    expect(google.reviewsImported).toBe(shop.reviewCount);
    expect(await ds.getAspects("corner-bakery")).not.toBeNull();
  });

  it("adds a few new reviews when syncing again", () => {
    const [before] = listSourcesAt("spice-indiranagar", T0);
    syncSourceAt("spice-indiranagar", before.id, T0);
    expect(listSourcesAt("spice-indiranagar", T0 + 1000)[0].status).toBe("syncing");
    const after = listSourcesAt("spice-indiranagar", T0 + 7000)[0];
    expect(after.status).toBe("connected");
    expect(after.reviewsImported - before.reviewsImported).toBeGreaterThanOrEqual(0);
    expect(after.reviewsImported - before.reviewsImported).toBeLessThanOrEqual(5);
  });

  it("disconnects a source", () => {
    const [google] = listSourcesAt("spice-indiranagar", T0);
    expect(disconnectSourceAt("spice-indiranagar", google.id)?.status).toBe("disconnected");
  });
});
