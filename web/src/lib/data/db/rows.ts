import { summarize, toKpis } from "../derive";
import type { Aspect, Headline, MonthPoint, Overview, Review, Shop, ShopType, Tone } from "../schemas";

// Rows as the database stores them (db/migrations, snake_case), and their mapping to the data
// contract the screens use. jsonb columns arrive already parsed.

export type ShopRow = {
  id: string;
  name: string;
  type: ShopType;
  is_demo: boolean;
  owner_id: string | null;
  review_count: number;
  date_from: string | null;
  date_to: string | null;
  last_upload_at: string | null;
  headline: Headline;
  top_complaints: Overview["topComplaints"];
};
export type MonthRow = Omit<MonthPoint, "stars"> & { stars: number[] | null };
export type AspectRow = {
  id: string;
  name: string;
  grp: string | null;
  is_new: boolean;
  mentions: number;
  pos_pct: number;
  neg_pct: number;
  neu_pct: number;
  monthly: MonthPoint[];
  example_review_ids: string[];
};
export type ReviewRow = {
  id: string;
  date: string | null;
  stars: number | null;
  text: string;
  sentiment: Tone;
  confidence: number;
  aspect_mentions: Review["aspectMentions"];
};

export const SHOP_COLUMNS = "id, name, type, is_demo, owner_id, review_count, date_from, date_to, last_upload_at, headline, top_complaints";
export const MONTH_COLUMNS = "month, count, pos, neg, neu, stars";
export const ASPECT_COLUMNS = "id, name, grp, is_new, mentions, pos_pct, neg_pct, neu_pct, monthly, example_review_ids";
export const REVIEW_COLUMNS = "id, date, stars, text, sentiment, confidence, aspect_mentions";

const monthOf = (d: Date) => d.toISOString().slice(0, 7);

export function toShop(row: ShopRow, now = new Date()): Shop {
  const fallback = monthOf(now); // a shop with no reviews yet has no months of its own
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    isDemo: row.is_demo,
    reviewCount: row.review_count,
    dateRange: { from: row.date_from ?? fallback, to: row.date_to ?? fallback },
    ...(row.last_upload_at ? { lastUploadAt: row.last_upload_at } : {}),
    unreadAlerts: 0, // alerts still live in the mock store (Part 5)
  };
}

export function toOverview(shop: ShopRow, months: MonthRow[]): Overview {
  const monthly: MonthPoint[] = months.map((m) => ({ ...m }));
  const s = summarize(monthly);
  return { shopId: shop.id, headline: shop.headline, kpis: toKpis(s), monthly, starMix: s.starMix, topComplaints: shop.top_complaints };
}

export function toAspect(row: AspectRow): Aspect {
  return {
    id: row.id,
    name: row.name,
    ...(row.grp ? { group: row.grp } : {}),
    mentions: row.mentions,
    posPct: row.pos_pct,
    negPct: row.neg_pct,
    neuPct: row.neu_pct,
    monthly: row.monthly,
    ...(row.is_new ? { isNew: true } : {}),
    exampleReviewIds: row.example_review_ids,
  };
}

export function toReview(row: ReviewRow): Review {
  return {
    id: row.id,
    date: row.date,
    stars: row.stars,
    text: row.text,
    sentiment: row.sentiment,
    confidence: row.confidence,
    aspectMentions: row.aspect_mentions,
  };
}
