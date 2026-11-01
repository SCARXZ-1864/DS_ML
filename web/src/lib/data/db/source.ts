import type { SupabaseClient } from "@supabase/supabase-js";
import type { ReviewQuery, ReviewSort } from "../schemas";
import type { DbReads } from "./compose";
import {
  ASPECT_COLUMNS, MONTH_COLUMNS, REVIEW_COLUMNS, SHOP_COLUMNS, toAspect, toOverview, toReview, toShop,
  type AspectRow, type MonthRow, type ReviewRow, type ShopRow,
} from "./rows";

/** A failed query is an outage, not "no data": throw so the page shows its error state. */
function check<T>(res: { data: T | null; error: { message: string } | null }, what: string): T | null {
  if (res.error) throw new Error(`Database read failed (${what}): ${res.error.message}`);
  return res.data;
}

// Same orders as the mock (mock/query.ts): reviews without a date or stars go last, ties by id.
const ORDER: Record<ReviewSort, [column: string, ascending: boolean][]> = {
  newest: [["date", false], ["id", false]],
  oldest: [["date", true], ["id", true]],
  lowest: [["stars", true], ["date", false], ["id", false]],
  highest: [["stars", false], ["date", false], ["id", false]],
};

export function createDbReads(db: SupabaseClient): DbReads {
  const shopRow = async (id: string) =>
    check<ShopRow>(await db.from("shops").select(SHOP_COLUMNS).eq("id", id).maybeSingle(), "shop");

  return {
    async listDemoShops() {
      const rows = check<ShopRow[]>(await db.from("shops").select(SHOP_COLUMNS).eq("is_demo", true).order("name"), "shops");
      return (rows ?? []).map((r) => toShop(r));
    },

    async getShop(id) {
      const row = await shopRow(id);
      return row ? toShop(row) : null;
    },

    async getShopOwner(id) {
      return (await shopRow(id))?.owner_id ?? null;
    },

    async getOverview(id) {
      const [shop, months] = await Promise.all([
        shopRow(id),
        db.from("shop_months").select(MONTH_COLUMNS).eq("shop_id", id).order("month"),
      ]);
      const rows = check<MonthRow[]>(months, "months");
      // The overview needs at least one month; a shop with no reviews has no overview yet.
      return shop && rows && rows.length > 0 ? toOverview(shop, rows) : null;
    },

    async getAspects(id) {
      const [shop, aspects] = await Promise.all([
        shopRow(id),
        db.from("aspects").select(ASPECT_COLUMNS).eq("shop_id", id).order("rank"),
      ]);
      const rows = check<AspectRow[]>(aspects, "aspects");
      return shop ? (rows ?? []).map(toAspect) : null;
    },

    async getReviewsByIds(id, ids) {
      if (ids.length === 0) return [];
      const rows = check<ReviewRow[]>(await db.from("reviews").select(REVIEW_COLUMNS).eq("shop_id", id).in("id", ids), "reviews");
      const byId = new Map((rows ?? []).map((r) => [r.id, toReview(r)]));
      return ids.flatMap((rid) => byId.get(rid) ?? []); // in the order asked for
    },

    async getReviews(id, q: ReviewQuery) {
      if (!(await shopRow(id))) return null;
      let query = db.from("reviews").select(REVIEW_COLUMNS, { count: "exact" }).eq("shop_id", id);
      if (q.sentiment) query = query.eq("sentiment", q.sentiment);
      if (q.stars !== undefined) query = query.eq("stars", q.stars);
      if (q.aspectId) query = query.contains("aspect_ids", [q.aspectId]);
      if (q.search) query = query.textSearch("search", q.search, { type: "websearch", config: "english" });
      for (const [column, ascending] of ORDER[q.sort]) query = query.order(column, { ascending, nullsFirst: false });
      const offset = q.cursor ? Number(q.cursor) : 0;
      const res = await query.range(offset, offset + q.limit - 1);
      const rows = check<ReviewRow[]>(res, "review page") ?? [];
      const total = res.count ?? 0;
      const next = offset + q.limit;
      return { items: rows.map(toReview), nextCursor: next < total ? String(next) : null, total };
    },
  };
}
