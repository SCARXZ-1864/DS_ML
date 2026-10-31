import type { AlertEvent, AlertRule } from "../schemas";
import { getStore, patchShop, seedOnce, type Store } from "./store";

// Alert rules and the alerts they produced. In Part 5 a scheduled job evaluates the rules and
// sends email; here the sample shop comes with a short history so the page has something to show.

function seed(store: Store) {
  const shopId = "spice-indiranagar";
  const aspects = store.entries.get(shopId)?.aspects ?? [];
  const byComplaints = [...aspects].sort((a, b) => b.negPct - a.negPct);
  const [worst, second] = [byComplaints[0], byComplaints[1] ?? byComplaints[0]];
  if (!worst) return;

  store.rules.set(shopId, [
    { id: "r-1", shopId, enabled: true, kind: "aspect_rise", params: { aspectId: worst.id, thresholdPts: 10 } },
    { id: "r-2", shopId, enabled: true, kind: "rating_below", params: { stars: 3.5 } },
    { id: "r-3", shopId, enabled: false, kind: "digest", params: { weekday: "mon" } },
  ]);
  store.events.set(shopId, [
    { id: "e-5", shopId, ruleId: "r-1", createdAt: "2026-10-29T08:00:00.000Z", read: false, tone: "negative",
      title: `Complaints about ${worst.name} rose 11 points`, detail: "Mostly weekend evenings; 14 of the last 40 reviews mention it." },
    { id: "e-4", shopId, ruleId: "r-2", createdAt: "2026-10-26T08:00:00.000Z", read: false, tone: "negative",
      title: "Average rating fell to 3.4★ this week", detail: "Down from 3.9★ the week before." },
    { id: "e-3", shopId, ruleId: "r-3", createdAt: "2026-10-20T08:00:00.000Z", read: true, tone: "neutral",
      title: "Weekly summary: 96 new reviews", detail: `${second.name} was the most discussed topic.` },
    { id: "e-2", shopId, ruleId: "r-1", createdAt: "2026-10-09T08:00:00.000Z", read: true, tone: "positive",
      title: `Complaints about ${second.name} fell 7 points`, detail: "Back to its usual level." },
    { id: "e-1", shopId, ruleId: "r-3", createdAt: "2026-10-06T08:00:00.000Z", read: true, tone: "neutral",
      title: "Weekly summary: 88 new reviews", detail: `${worst.name} drew the most complaints.` },
  ]);
}

const store = () => seedOnce("alerts", seed);

export function listAlertRules(shopId: string): AlertRule[] {
  return store().rules.get(shopId) ?? [];
}

/** Adds a rule (when its id is empty) or replaces the one with the same id. */
export function saveAlertRule(rule: AlertRule): AlertRule {
  const all = store().rules;
  const list = all.get(rule.shopId) ?? [];
  if (!rule.id) {
    const next = Math.max(0, ...[...all.values()].flat().map((r) => Number(r.id.slice(2)) || 0)) + 1;
    const added = { ...rule, id: `r-${next}` };
    all.set(rule.shopId, [...list, added]);
    return added;
  }
  all.set(rule.shopId, list.map((r) => (r.id === rule.id ? rule : r)));
  return rule;
}

export function deleteAlertRule(shopId: string, ruleId: string): void {
  const all = store().rules;
  all.set(shopId, (all.get(shopId) ?? []).filter((r) => r.id !== ruleId));
}

export function listAlertEvents(shopId: string): AlertEvent[] {
  return [...(store().events.get(shopId) ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function markAlertsRead(shopId: string): void {
  const events = store().events;
  events.set(shopId, (events.get(shopId) ?? []).map((e) => ({ ...e, read: true })));
  if (getStore().entries.has(shopId) || getStore().emptyShops.has(shopId)) patchShop(shopId, { unreadAlerts: 0 });
}
