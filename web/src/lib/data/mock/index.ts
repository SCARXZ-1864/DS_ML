import type { DataSource } from "../index";
import { aspectInRange, normalizeRange, sliceMonths, summarize, toKpis } from "../derive";
import { buildDb } from "./build";
import { queryReviews } from "./query";
import { SHOP_DEFS } from "./shops";

// Built once per server process. Seeded, so every run produces identical data.
const db = buildDb(SHOP_DEFS);

export const mockDataSource: DataSource = {
  async listShops() {
    return [...db.values()].map((e) => e.shop);
  },

  async getShop(id) {
    return db.get(id)?.shop ?? null;
  },

  async getOverview(id, range) {
    const entry = db.get(id);
    if (!entry) return null;
    if (!range) return entry.overview;
    const r = normalizeRange(entry.overview.monthly, range);
    const monthly = sliceMonths(entry.overview.monthly, r);
    const s = summarize(monthly);
    return { ...entry.overview, monthly, kpis: toKpis(s), starMix: s.starMix };
  },

  async getAspects(id, range) {
    const entry = db.get(id);
    if (!entry) return null;
    if (!range) return entry.aspects;
    const r = normalizeRange(entry.overview.monthly, range);
    return entry.aspects.map((a) => aspectInRange(a, r));
  },

  async getReviewsByIds(id, ids) {
    const entry = db.get(id);
    if (!entry) return [];
    const wanted = new Set(ids);
    return entry.reviews.filter((r) => wanted.has(r.id));
  },

  async getTopics(id) {
    return db.get(id)?.topics ?? null;
  },

  async getReviews(id, query) {
    const entry = db.get(id);
    return entry ? queryReviews(entry.reviews, query) : null;
  },
};
