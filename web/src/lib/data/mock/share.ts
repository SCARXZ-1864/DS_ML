import { aspectInRange, fullRange, lastMonths, rangeHeadline, sliceMonths, summarize, toKpis } from "../derive";
import type { Report, ShareInput, ShareLink, SharePeriod } from "../schemas";
import { getStore, seedOnce, type Store } from "./store";

// Read-only report links. The token is the only secret: anyone holding it can see the report,
// so it is long and random, and revoking it makes the report disappear for everyone.

const MONTHS: Record<SharePeriod, number | null> = { "30d": 1, "90d": 3, all: null };

function seed(store: Store) {
  store.links.set("demo-report-link", {
    token: "demo-report-link", shopId: "spice-indiranagar", period: "90d", sections: ["overview", "aspects", "quotes"],
    createdAt: "2026-10-14T11:20:00.000Z", views: 12, revokedAt: null,
  });
}

const links = () => seedOnce("share", seed).links;

export function listShareLinks(shopId: string): ShareLink[] {
  return [...links().values()].filter((l) => l.shopId === shopId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function createShareLink(shopId: string, input: ShareInput, nowMs = Date.now()): ShareLink {
  const token = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  const link: ShareLink = { token, shopId, ...input, createdAt: new Date(nowMs).toISOString(), views: 0, revokedAt: null };
  links().set(token, link);
  return link;
}

/** Null when the token isn't one of this shop's links. */
export function revokeShareLink(shopId: string, token: string, nowMs = Date.now()): ShareLink | null {
  const link = links().get(token);
  if (!link || link.shopId !== shopId) return null;
  link.revokedAt ??= new Date(nowMs).toISOString();
  return link;
}

/** The report behind a token, counting the view. Null for unknown and revoked tokens alike. */
export function getReport(token: string): Report | null {
  const link = links().get(token);
  const entry = link ? getStore().entries.get(link.shopId) : undefined;
  if (!link || link.revokedAt || !entry) return null;
  link.views += 1;

  const monthly = entry.overview.monthly;
  const n = MONTHS[link.period];
  const range = n === null ? fullRange(monthly) : lastMonths(monthly, n);
  const summary = summarize(sliceMonths(monthly, range));
  const aspects = entry.aspects.map((a) => aspectInRange(a, range));
  const worst = [...aspects].filter((a) => a.mentions > 0).sort((a, b) => b.negPct - a.negPct)[0]?.name ?? null;
  const quotes = [...entry.reviews]
    .filter((r) => r.date !== null && r.date >= `${range.from}-01`)
    .sort((a, b) => (b.helpful ?? 0) - (a.helpful ?? 0))
    .slice(0, 3);

  return {
    shop: entry.shop,
    period: link.period,
    sections: link.sections,
    headline: n === null ? entry.overview.headline : rangeHeadline(range, summary, worst),
    kpis: toKpis(summary),
    aspects: link.sections.includes("aspects") ? aspects.filter((a) => a.mentions > 0) : [],
    quotes: link.sections.includes("quotes") ? quotes : [],
  };
}
