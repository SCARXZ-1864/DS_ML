import { beforeEach, describe, expect, it } from "vitest";
import type { Aspect } from "../schemas";
import { UploadSchema } from "../schemas";
import { mockDataSource as ds } from "./index";
import { resetStore } from "./store";
import { detectChanges, FAIL_MESSAGE, getUploadAt, listUploadsAt, startUploadAt } from "./uploads";

const T0 = Date.parse("2026-10-31T10:00:00Z");
const req = (fileName = "reviews.csv") => ({
  fileName,
  rows: [{ text: "Lovely" }, { text: "Too slow" }],
  skipped: { empty: 1, duplicate: 0, invalid: 0 },
});

beforeEach(() => resetStore());

describe("upload processing", () => {
  it("moves through the stages as time passes", () => {
    const up = startUploadAt("spice-koramangala", req(), T0);
    const at = (s: number) => getUploadAt("spice-koramangala", up.id, T0 + s * 1000)!;
    expect(at(0).stages.map((s) => s.status)).toEqual(["running", "pending", "pending", "pending", "pending"]);
    expect(at(4).stages.map((s) => s.status)).toEqual(["done", "done", "running", "pending", "pending"]);
    expect(at(4).status).toBe("processing");
    expect(at(9).status).toBe("done");
    UploadSchema.parse(at(9));
    expect(at(9)).toMatchObject({ rowsAccepted: 2, rowsSkipped: { empty: 1, duplicate: 0, invalid: 0 } });
  });

  it("fails at the sentiment stage for a file named like 'fail'", () => {
    const up = startUploadAt("spice-koramangala", req("fail.csv"), T0);
    const done = getUploadAt("spice-koramangala", up.id, T0 + 9000)!;
    expect(done.status).toBe("failed");
    expect(done.stages[2]).toMatchObject({ name: "Scoring sentiment", status: "failed" });
    expect(done.stages[3].status).toBe("pending");
    expect(done.error).toBe(FAIL_MESSAGE);
    expect(FAIL_MESSAGE).toBe("The sentiment model didn't respond. Nothing was changed. Try again in a minute.");
  });

  it("adds the accepted rows to the shop once, when processing finishes", async () => {
    const before = (await ds.getShop("spice-koramangala"))!.reviewCount;
    const up = startUploadAt("spice-koramangala", req(), T0);
    getUploadAt("spice-koramangala", up.id, T0 + 9000);
    getUploadAt("spice-koramangala", up.id, T0 + 20000);
    const shop = (await ds.getShop("spice-koramangala"))!;
    expect(shop.reviewCount).toBe(before + 2);
    expect(shop.lastUploadAt).toBe("2026-10-31");
  });

  it("fills an empty shop on its first upload and reports every aspect as new", async () => {
    await ds.createShop("u-x", { name: "Corner Bakery", type: "salon" });
    const up = startUploadAt("corner-bakery", req(), T0);
    const done = getUploadAt("corner-bakery", up.id, T0 + 9000)!;
    const aspects = (await ds.getAspects("corner-bakery"))!;
    expect(aspects.length).toBeGreaterThan(0);
    expect(done.changes.every((c) => c.kind === "new_aspect")).toBe(true);
    expect(done.changes).toHaveLength(aspects.length);
  });

  it("lists a shop's uploads newest first, including the sample history", () => {
    const seeded = listUploadsAt("spice-koramangala", T0);
    expect(seeded.length).toBe(2);
    const up = startUploadAt("spice-koramangala", req(), T0);
    expect(listUploadsAt("spice-koramangala", T0)[0].id).toBe(up.id);
    seeded.forEach((u) => UploadSchema.parse(u));
  });

  it("knows nothing about another shop's upload id", () => {
    const up = startUploadAt("spice-koramangala", req(), T0);
    expect(getUploadAt("spice-indiranagar", up.id, T0)).toBeNull();
  });
});

const aspect = (id: string, negPct: number, mentions = 10): Aspect => ({
  id, name: id === "wait" ? "Wait time" : id, mentions, posPct: 50, negPct, neuPct: 50 - negPct, monthly: [], exampleReviewIds: [],
});

describe("detectChanges", () => {
  it("reports a rise in complaints of at least the threshold", () => {
    expect(detectChanges([aspect("wait", 10)], [aspect("wait", 18)])).toEqual([
      { kind: "rise", aspectId: "wait", deltaPct: 8, note: "Complaints about Wait time rose 8 points" },
    ]);
  });

  it("reports a fall in complaints", () => {
    expect(detectChanges([aspect("wait", 20)], [aspect("wait", 12)])[0]).toMatchObject({ kind: "fall", deltaPct: -8 });
  });

  it("reports an aspect customers newly mention", () => {
    expect(detectChanges([], [aspect("parking", 5)])[0]).toMatchObject({ kind: "new_aspect", aspectId: "parking" });
  });

  it("ignores small moves and aspects nobody mentioned", () => {
    expect(detectChanges([aspect("wait", 10)], [aspect("wait", 12), aspect("x", 50, 0)])).toEqual([]);
  });
});
