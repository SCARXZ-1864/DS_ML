import type { GoogleLocation, Source } from "../schemas";
import { mulberry32, seedFrom } from "./rng";
import { attachData, findShop, getStore, patchShop, seedOnce, type Store } from "./store";

// Simulated Google Business Profile connection. Like uploads, a sync stores when it started
// and its status is worked out from the time that has passed (6 s of "syncing").

export const SYNC_MS = 6000;

export type StoredSource = Source & { syncStartedMs: number | null };

const iso = (ms: number) => new Date(ms).toISOString();

/** Finishes a sync the first time it is read after SYNC_MS: imports reviews and updates the shop. */
function settle(s: StoredSource, nowMs: number): void {
  if (s.syncStartedMs === null || nowMs - s.syncStartedMs < SYNC_MS) return;
  const finishedMs = s.syncStartedMs + SYNC_MS;
  const store = getStore();
  if (!store.entries.has(s.shopId)) {
    const entry = attachData(s.shopId);
    s.reviewsImported = entry?.shop.reviewCount ?? 0;
  } else {
    const added = Math.floor(mulberry32(seedFrom(`${s.id}:${s.syncStartedMs}`))() * 6);
    s.reviewsImported += added;
    patchShop(s.shopId, { reviewCount: store.entries.get(s.shopId)!.shop.reviewCount + added });
  }
  s.status = "connected";
  s.lastSyncAt = iso(finishedMs);
  s.syncStartedMs = null;
}

function view(s: StoredSource, nowMs: number): Source {
  settle(s, nowMs);
  const { syncStartedMs, ...source } = s;
  return syncStartedMs !== null ? { ...source, status: "syncing" } : source;
}

function seed(store: Store) {
  store.sources.set("spice-indiranagar", [
    {
      id: "src-spice-indiranagar-google", shopId: "spice-indiranagar", kind: "google", status: "connected",
      accountLabel: "owner@demo.test", locationName: "Spice Route · Indiranagar",
      lastSyncAt: "2026-10-30T06:00:00.000Z", reviewsImported: 1240, syncStartedMs: null,
    },
  ]);
  store.sources.set("spice-koramangala", [
    {
      id: "src-spice-koramangala-csv", shopId: "spice-koramangala", kind: "csv", status: "connected",
      lastSyncAt: "2026-10-03T09:00:00.000Z", reviewsImported: 402, syncStartedMs: null,
    },
  ]);
}

const sources = () => seedOnce("sources", seed).sources;
const find = (shopId: string, sourceId: string) => (sources().get(shopId) ?? []).find((s) => s.id === sourceId) ?? null;

export function listSourcesAt(shopId: string, nowMs: number): Source[] {
  return (sources().get(shopId) ?? []).map((s) => view(s, nowMs));
}

/** The mock Google account's locations: one named after the shop, plus two more to choose from. */
export function listGoogleLocations(shopId: string): GoogleLocation[] {
  const name = findShop(shopId)?.name ?? "Your business";
  return [
    { id: "loc-1", name, address: "12 Main Road" },
    { id: "loc-2", name: `${name} · Second branch`, address: "4th Cross, Market Street" },
    { id: "loc-3", name: `${name} · Kiosk`, address: "City Mall, level 2" },
  ];
}

export function connectGoogleAt(shopId: string, input: { locationId: string; accountLabel: string }, nowMs: number): Source | null {
  const location = listGoogleLocations(shopId).find((l) => l.id === input.locationId);
  if (!location || !findShop(shopId)) return null;
  const all = sources();
  const existing = (all.get(shopId) ?? []).find((s) => s.kind === "google");
  const source: StoredSource = {
    id: `src-${shopId}-google`, shopId, kind: "google", status: "syncing", accountLabel: input.accountLabel,
    locationName: location.name, reviewsImported: existing?.reviewsImported ?? 0, syncStartedMs: nowMs,
  };
  all.set(shopId, [source, ...(all.get(shopId) ?? []).filter((s) => s.kind !== "google")]);
  return view(source, nowMs);
}

export function syncSourceAt(shopId: string, sourceId: string, nowMs: number): Source | null {
  const s = find(shopId, sourceId);
  if (!s || s.kind !== "google" || s.status === "disconnected") return null;
  settle(s, nowMs);
  s.syncStartedMs ??= nowMs;
  return view(s, nowMs);
}

export function disconnectSourceAt(shopId: string, sourceId: string): Source | null {
  const s = find(shopId, sourceId);
  if (!s) return null;
  s.status = "disconnected";
  s.syncStartedMs = null;
  return view(s, 0);
}
