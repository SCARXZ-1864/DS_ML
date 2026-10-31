import type { DataSource } from "../index";
import { aspectInRange, normalizeRange, sliceMonths, summarize, toKpis } from "../derive";
import { composeAnswer, streamChunks } from "./ask";
import { predictText } from "./predict";
import { queryReviews } from "./query";
import { createShop, EMPTY_PAGE, findShop, getStore, listShopsFor } from "./store";

// Pause between streamed chunks, so the UI shows the answer arriving word by word.
const STREAM_DELAY_MS = 30;

// Shops and owner state live in the store (seeded once per server process, so every run starts the same).
const entry = (id: string) => getStore().entries.get(id);

export const mockDataSource: DataSource = {
  async listShops(userId) {
    return listShopsFor(userId);
  },

  async getShop(id) {
    return findShop(id);
  },

  async getShopOwner(id) {
    return getStore().owners.get(id) ?? null;
  },

  async createShop(userId, input) {
    return createShop(userId, input);
  },

  async getUser(id) {
    return getStore().users.get(id) ?? null;
  },

  async saveUser(user) {
    getStore().users.set(user.id, user);
    return user;
  },

  async getOverview(id, range) {
    const e = entry(id);
    if (!e) return null;
    if (!range) return e.overview;
    const r = normalizeRange(e.overview.monthly, range);
    const monthly = sliceMonths(e.overview.monthly, r);
    const s = summarize(monthly);
    return { ...e.overview, monthly, kpis: toKpis(s), starMix: s.starMix };
  },

  async getAspects(id, range) {
    const e = entry(id);
    if (!e) return null;
    if (!range) return e.aspects;
    const r = normalizeRange(e.overview.monthly, range);
    return e.aspects.map((a) => aspectInRange(a, r));
  },

  async getReviewsByIds(id, ids) {
    const e = entry(id);
    if (!e) return [];
    const wanted = new Set(ids);
    return e.reviews.filter((r) => wanted.has(r.id));
  },

  async getTopics(id) {
    return entry(id)?.topics ?? null;
  },

  async getReviews(id, query) {
    const e = entry(id);
    if (e) return queryReviews(e.reviews, query);
    return findShop(id) ? EMPTY_PAGE : null;
  },

  async ask(id, question) {
    const e = entry(id);
    return e ? streamChunks(composeAnswer(question, e.aspects, e.reviews), STREAM_DELAY_MS) : null;
  },

  async predict(id, text) {
    const e = entry(id);
    return e ? predictText(text, e.aspects) : null;
  },
};
