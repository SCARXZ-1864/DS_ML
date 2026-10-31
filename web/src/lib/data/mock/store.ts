import type {
  AlertEvent, AlertRule, NewShopInput, Review, ReviewPage, ShareLink, Shop, User,
} from "../schemas";
import { buildDb, type ShopEntry } from "./build";
import { SHOP_DEFS, templateFor } from "./shops";
import type { StoredSource } from "./sources";
import type { StoredUpload } from "./uploads";

// All mutable mock state in one place. It lives on globalThis so hot reloads in `next dev`
// don't wipe it, and it resets when the server restarts (fine for a mock; Part 3 adds a database).

export const DEMO_OWNER: User = { id: "u-demo-owner", name: "Demo owner", email: "owner@demo.test", alertEmail: "owner@demo.test" };

export type Store = {
  entries: Map<string, ShopEntry>; // shops with data
  emptyShops: Map<string, Shop>; // owner shops with no reviews yet
  owners: Map<string, string>; // shopId → userId
  users: Map<string, User>;
  uploads: Map<string, StoredUpload[]>; // newest first
  sources: Map<string, StoredSource[]>;
  rules: Map<string, AlertRule[]>;
  events: Map<string, AlertEvent[]>;
  links: Map<string, ShareLink>; // token → link
  seeded: Set<string>; // which feature modules have added their sample data
};

function freshStore(): Store {
  const entries = buildDb(SHOP_DEFS);
  const owners = new Map<string, string>();
  for (const e of entries.values()) if (!e.shop.isDemo) owners.set(e.shop.id, DEMO_OWNER.id);
  return {
    entries,
    emptyShops: new Map(),
    owners,
    users: new Map([[DEMO_OWNER.id, DEMO_OWNER]]),
    uploads: new Map(),
    sources: new Map(),
    rules: new Map(),
    events: new Map(),
    links: new Map(),
    seeded: new Set(),
  };
}

const holder = globalThis as typeof globalThis & { __riMockStore?: Store };

export function getStore(): Store {
  holder.__riMockStore ??= freshStore();
  return holder.__riMockStore;
}

/** Tests only: start again from the seeded state. */
export function resetStore(): void {
  holder.__riMockStore = freshStore();
}

/** Runs a feature module's seeding once per store. */
export function seedOnce(key: string, seed: (store: Store) => void): Store {
  const store = getStore();
  if (!store.seeded.has(key)) {
    store.seeded.add(key);
    seed(store);
  }
  return store;
}

export function findShop(id: string): Shop | null {
  const store = getStore();
  return store.entries.get(id)?.shop ?? store.emptyShops.get(id) ?? null;
}

export function listShopsFor(userId: string | null): Shop[] {
  const store = getStore();
  const all = [...[...store.entries.values()].map((e) => e.shop), ...store.emptyShops.values()];
  return all.filter((s) => s.isDemo || (userId !== null && store.owners.get(s.id) === userId));
}

const slug = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "shop";

const monthOf = (nowMs: number) => new Date(nowMs).toISOString().slice(0, 7);

export function createShop(userId: string, input: NewShopInput, nowMs = Date.now()): Shop {
  const base = slug(input.name);
  let id = base;
  for (let n = 2; findShop(id); n++) id = `${base}-${n}`;
  const month = monthOf(nowMs);
  const shop: Shop = {
    id, name: input.name, type: input.type, isDemo: false, reviewCount: 0,
    dateRange: { from: month, to: month }, unreadAlerts: 0,
  };
  const store = getStore();
  store.emptyShops.set(id, shop);
  store.owners.set(id, userId);
  return shop;
}

/** Fills a shop with the mock dataset for its type, as if its first import just finished. */
export function attachData(shopId: string): ShopEntry | null {
  const store = getStore();
  const shop = findShop(shopId);
  if (!shop) return null;
  const template = templateFor(shop.type);
  const def = { ...template, id: shop.id, name: shop.name, isDemo: false, unreadAlerts: shop.unreadAlerts, lastUploadAt: undefined };
  const entry = buildDb([def]).get(shop.id)!;
  entry.shop = { ...entry.shop, name: shop.name, type: shop.type };
  store.entries.set(shop.id, entry);
  store.emptyShops.delete(shop.id);
  return entry;
}

/** Changes a shop's summary fields wherever it is stored. */
export function patchShop(shopId: string, patch: Partial<Shop>): void {
  const store = getStore();
  const entry = store.entries.get(shopId);
  if (entry) entry.shop = { ...entry.shop, ...patch };
  const empty = store.emptyShops.get(shopId);
  if (empty) store.emptyShops.set(shopId, { ...empty, ...patch });
}

export const EMPTY_PAGE: ReviewPage = { items: [] as Review[], nextCursor: null, total: 0 };
