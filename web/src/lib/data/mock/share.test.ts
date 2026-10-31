import { beforeEach, describe, expect, it } from "vitest";
import { ReportSchema, ShareLinkSchema } from "../schemas";
import { mockDataSource as ds } from "./index";
import { resetStore } from "./store";

beforeEach(() => resetStore());

describe("share links", () => {
  it("creates a link with a 16-character hex token", async () => {
    const link = await ds.createShareLink("spice-indiranagar", { period: "30d", sections: ["overview"] });
    expect(link.token).toMatch(/^[0-9a-f]{16}$/);
    ShareLinkSchema.parse(link);
    expect((await ds.listShareLinks("spice-indiranagar"))[0].token).toBe(link.token);
  });

  it("seeds one active link for the sample shop", async () => {
    const links = await ds.listShareLinks("spice-indiranagar");
    expect(links).toHaveLength(1);
    expect(links[0].revokedAt).toBeNull();
  });

  it("counts a view each time the report is opened", async () => {
    const link = await ds.createShareLink("spice-indiranagar", { period: "all", sections: ["overview", "aspects", "quotes"] });
    const report = await ds.getReport(link.token);
    ReportSchema.parse(report);
    await ds.getReport(link.token);
    expect((await ds.listShareLinks("spice-indiranagar")).find((l) => l.token === link.token)?.views).toBe(2);
  });

  it("returns no report for a revoked or unknown token", async () => {
    const link = await ds.createShareLink("spice-indiranagar", { period: "all", sections: ["overview"] });
    await ds.revokeShareLink("spice-indiranagar", link.token);
    expect(await ds.getReport(link.token)).toBeNull();
    expect(await ds.getReport("ffffffffffffffff")).toBeNull();
  });

  it("only fills the sections that were shared", async () => {
    const link = await ds.createShareLink("spice-indiranagar", { period: "90d", sections: ["aspects"] });
    const report = (await ds.getReport(link.token))!;
    expect(report.aspects.length).toBeGreaterThan(0);
    expect(report.quotes).toEqual([]);
  });

  it("won't revoke a link through another shop", async () => {
    const link = await ds.createShareLink("spice-indiranagar", { period: "30d", sections: ["overview"] });
    expect(await ds.revokeShareLink("spice-koramangala", link.token)).toBeNull();
    expect(await ds.getReport(link.token)).not.toBeNull();
  });
});
