import { aspectsInRange, overviewInRange } from "../derive";
import type { DataSource } from "../index";
import { composeAnswer, streamChunks } from "../mock/ask";
import { compareSides, type CompareSide } from "../mock/compare";
import { STREAM_DELAY_MS } from "../mock";
import { predictText } from "../mock/predict";
import { deriveTopics } from "../mock/topics";
import type { Aspect, Overview, Review, ReviewPage, ReviewQuery, Shop } from "../schemas";

/** What the database answers today: the demo shops' data (Part 3). */
export interface DbReads {
  listDemoShops(): Promise<Shop[]>;
  getShop(id: string): Promise<Shop | null>;
  getShopOwner(id: string): Promise<string | null>;
  /** The whole history; callers apply date ranges. */
  getOverview(id: string): Promise<Overview | null>;
  getAspects(id: string): Promise<Aspect[] | null>;
  getReviewsByIds(id: string, ids: string[]): Promise<Review[]>;
  getReviews(id: string, query: ReviewQuery): Promise<ReviewPage | null>;
}

/**
 * Demo shops come from the database; owner shops and everything owners manage (uploads,
 * sources, alerts, share links, users) stay in the mock store until Parts 4–5 move them.
 * The mock's own demo shops are hidden, so each shop has exactly one source.
 */
export function withDatabase(mock: DataSource, db: DbReads): DataSource {
  const ownerShop = async (id: string) => {
    const shop = await mock.getShop(id);
    return shop !== null && !shop.isDemo;
  };
  const examples = async (id: string, aspects: Aspect[]) =>
    db.getReviewsByIds(id, [...new Set(aspects.flatMap((a) => a.exampleReviewIds))]);
  const side = async (id: string): Promise<CompareSide | null> => {
    if (await ownerShop(id)) {
      const [shop, aspects] = await Promise.all([mock.getShop(id), mock.getAspects(id)]);
      return shop ? { shop, aspects: aspects ?? [] } : null;
    }
    const [shop, aspects] = await Promise.all([db.getShop(id), db.getAspects(id)]);
    return shop && aspects ? { shop, aspects } : null;
  };

  return {
    ...mock,

    async listShops(userId) {
      const [demo, mine] = await Promise.all([db.listDemoShops(), mock.listShops(userId)]);
      return [...demo, ...mine.filter((s) => !s.isDemo)];
    },

    async getShop(id) {
      return (await ownerShop(id)) ? mock.getShop(id) : db.getShop(id);
    },

    async getShopOwner(id) {
      return (await ownerShop(id)) ? mock.getShopOwner(id) : db.getShopOwner(id);
    },

    async getOverview(id, range) {
      if (await ownerShop(id)) return mock.getOverview(id, range);
      const o = await db.getOverview(id);
      return o ? overviewInRange(o, range) : null;
    },

    async getAspects(id, range) {
      if (await ownerShop(id)) return mock.getAspects(id, range);
      if (!range) return db.getAspects(id);
      const [aspects, o] = await Promise.all([db.getAspects(id), db.getOverview(id)]);
      return aspects && o ? aspectsInRange(aspects, o.monthly, range) : null;
    },

    async getReviewsByIds(id, ids) {
      return (await ownerShop(id)) ? mock.getReviewsByIds(id, ids) : db.getReviewsByIds(id, ids);
    },

    async getReviews(id, query) {
      return (await ownerShop(id)) ? mock.getReviews(id, query) : db.getReviews(id, query);
    },

    async getTopics(id) {
      if (await ownerShop(id)) return mock.getTopics(id);
      const aspects = await db.getAspects(id);
      return aspects ? deriveTopics(aspects, await examples(id, aspects)) : null;
    },

    async ask(id, question) {
      if (await ownerShop(id)) return mock.ask(id, question);
      const aspects = await db.getAspects(id);
      if (!aspects) return null;
      return streamChunks(composeAnswer(question, aspects, await examples(id, aspects)), STREAM_DELAY_MS);
    },

    async predict(id, text) {
      if (await ownerShop(id)) return mock.predict(id, text);
      const aspects = await db.getAspects(id);
      return aspects ? predictText(text, aspects) : null;
    },

    async compare(ids) {
      const [a, b] = await Promise.all(ids.map(side));
      return a && b ? compareSides(a, b) : null;
    },
  };
}
