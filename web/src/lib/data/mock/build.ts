import { aspectInRange, fullRange, summarize, toKpis } from "../derive";
import type { Aspect, MonthPoint, Overview, Review, Shop } from "../schemas";
import { mulberry32, seedFrom, splitInt } from "./rng";
import type { ShopDef } from "./shops";

export type ShopEntry = { shop: Shop; overview: Overview; aspects: Aspect[]; reviews: Review[] };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function monthKeys(from: string, n: number): string[] {
  const [year, month] = from.split("-").map(Number);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(year, month - 1 + i, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  });
}

/** 1★ and 2★ come from negative reviews, 3★ from neutral, 4★ and 5★ from positive. */
function starsFrom(pos: number, neg: number, neu: number): number[] {
  const [one, two] = splitInt(neg, [0.65, 0.35]);
  const [four, five] = splitInt(pos, [0.3, 0.7]);
  return [one, two, neu, four, five];
}

function buildReviews(def: ShopDef): Review[] {
  const rnd = mulberry32(seedFrom(`${def.id}:reviews`));
  return def.reviews.map((r) => ({
    id: r.id,
    date: r.date,
    stars: r.stars,
    text: r.text,
    sentiment: r.sentiment,
    confidence: Math.round((0.7 + 0.29 * rnd()) * 100) / 100,
    aspectMentions: r.mentions.map(([aspectId, phrase, sentiment]) => {
      const start = r.text.toLowerCase().indexOf(phrase.toLowerCase());
      if (start < 0) throw new Error(`Mock review ${r.id}: phrase "${phrase}" is not in its text`);
      return { aspectId, start, end: start + phrase.length, sentiment };
    }),
  }));
}

function buildShop(def: ShopDef): ShopEntry {
  const rnd = mulberry32(seedFrom(def.id));
  const last = Math.max(1, def.months - 1);

  const monthly: MonthPoint[] = monthKeys(def.from, def.months).map((month, i) => {
    const t = i / last;
    const count = Math.max(0, Math.round(def.baseVolume * (1 + def.growth * t) * (0.85 + 0.3 * rnd())));
    const negShare = clamp(def.negBase + def.negTrend * t + (rnd() - 0.5) * 0.03, 0.02, 0.9);
    const posShare = clamp(def.posBase - def.negTrend * 0.6 * t + (rnd() - 0.5) * 0.03, 0.05, 0.95 - negShare);
    const [pos, neg, neu] = splitInt(count, [posShare, negShare, Math.max(0, 1 - posShare - negShare)]);
    return { month, count, pos, neg, neu, stars: def.hasStars ? starsFrom(pos, neg, neu) : null };
  });
  const all = fullRange(monthly);
  const reviews = buildReviews(def);

  const aspects: Aspect[] = def.aspects.map((a) => {
    const ar = mulberry32(seedFrom(`${def.id}:${a.id}`));
    const aspectMonthly: MonthPoint[] = monthly.map((m, i) => {
      const t = i / last;
      const mentions = a.isNew && t < 0.75 ? 0 : Math.round(m.count * a.share * (0.8 + 0.4 * ar()));
      const neg = clamp(a.neg + a.drift * t + (ar() - 0.5) * 0.04, 0.01, 0.95);
      const pos = clamp(a.pos - a.drift * 0.5 * t + (ar() - 0.5) * 0.04, 0.01, 0.99 - neg);
      const [p, n, u] = splitInt(mentions, [pos, neg, Math.max(0, 1 - pos - neg)]);
      return { month: m.month, count: mentions, pos: p, neg: n, neu: u };
    });
    const base: Aspect = {
      id: a.id,
      name: a.name,
      group: a.group,
      mentions: 0,
      posPct: 0,
      negPct: 0,
      neuPct: 0,
      monthly: aspectMonthly,
      exampleReviewIds: reviews.filter((r) => r.aspectMentions.some((m) => m.aspectId === a.id)).map((r) => r.id),
      ...(a.isNew ? { isNew: true } : {}),
    };
    return aspectInRange(base, all);
  });

  const summary = summarize(monthly);
  const overview: Overview = {
    shopId: def.id,
    headline: def.headline,
    kpis: toKpis(summary),
    monthly,
    starMix: summary.starMix,
    topComplaints: [...aspects]
      .sort((x, y) => y.negPct - x.negPct)
      .slice(0, 3)
      .map((a) => ({
        aspectId: a.id,
        negPct: a.negPct,
        quoteReviewId:
          reviews.find((r) => r.aspectMentions.some((m) => m.aspectId === a.id && m.sentiment === "negative"))?.id ??
          null,
      })),
  };

  const shop: Shop = {
    id: def.id,
    name: def.name,
    type: def.type,
    isDemo: def.isDemo,
    reviewCount: summary.reviews,
    dateRange: all,
    unreadAlerts: def.unreadAlerts,
    ...(def.lastUploadAt ? { lastUploadAt: def.lastUploadAt } : {}),
  };

  return { shop, overview, aspects, reviews };
}

export function buildDb(defs: ShopDef[]): Map<string, ShopEntry> {
  return new Map(defs.map((d) => [d.id, buildShop(d)]));
}
