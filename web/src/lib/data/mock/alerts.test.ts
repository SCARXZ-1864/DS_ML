import { beforeEach, describe, expect, it } from "vitest";
import { AlertEventSchema, AlertRuleSchema } from "../schemas";
import { mockDataSource as ds } from "./index";
import { resetStore } from "./store";

beforeEach(() => resetStore());

describe("alerts", () => {
  it("seeds the sample shop with rules and a mix of read and unread alerts", async () => {
    const rules = await ds.listAlertRules("spice-indiranagar");
    expect(rules.map((r) => r.kind)).toEqual(["aspect_rise", "rating_below", "digest"]);
    rules.forEach((r) => AlertRuleSchema.parse(r));
    const events = await ds.listAlertEvents("spice-indiranagar");
    expect(events.filter((e) => !e.read)).toHaveLength(2);
    expect(events).toHaveLength(5);
    events.forEach((e) => AlertEventSchema.parse(e));
    expect(events.map((e) => e.createdAt)).toEqual([...events.map((e) => e.createdAt)].sort().reverse());
  });

  it("names a real aspect of the shop in the aspect rule and alerts", async () => {
    const aspects = (await ds.getAspects("spice-indiranagar"))!;
    const [rule] = await ds.listAlertRules("spice-indiranagar");
    expect(rule.kind === "aspect_rise" && aspects.some((a) => a.id === rule.params.aspectId)).toBe(true);
    const titles = (await ds.listAlertEvents("spice-indiranagar")).map((e) => e.title).join(" ");
    expect(aspects.some((a) => titles.includes(a.name))).toBe(true);
  });

  it("marks every alert read and clears the shop's badge", async () => {
    await ds.markAlertsRead("spice-indiranagar");
    expect((await ds.listAlertEvents("spice-indiranagar")).every((e) => e.read)).toBe(true);
    expect((await ds.getShop("spice-indiranagar"))!.unreadAlerts).toBe(0);
  });

  it("adds, updates and deletes rules", async () => {
    const added = await ds.saveAlertRule({ id: "", shopId: "spice-indiranagar", enabled: true, kind: "new_aspect", params: {} });
    expect(added.id).toMatch(/^r-\d+$/);
    await ds.saveAlertRule({ ...added, enabled: false });
    expect((await ds.listAlertRules("spice-indiranagar")).find((r) => r.id === added.id)?.enabled).toBe(false);
    await ds.deleteAlertRule("spice-indiranagar", added.id);
    expect((await ds.listAlertRules("spice-indiranagar")).some((r) => r.id === added.id)).toBe(false);
  });
});
