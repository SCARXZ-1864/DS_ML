import type { Aspect } from "./schemas";

// The Issues and "What to fix first" pages: every aspect customers complain about, and a ranking
// by impact. Pure functions, so the numbers are the same wherever they're computed.

export type Issue = {
  aspectId: string;
  name: string;
  /** Negative mentions. */
  complaints: number;
  /** Share of the shop's reviews that complain about it (0–100). */
  reachPct: number;
  /** Share of this aspect's mentions that are negative (0–100). */
  negPct: number;
  /** Change in negPct, last 3 months vs. the 3 before, in points; null with too little data. */
  change: number | null;
  /** The words customers use when complaining about it, most used first. */
  words: string[];
  /** Reviews to show as evidence: those quoted for the complaint words first. */
  reviewIds: string[];
};

export type RankedIssue = Issue & { impact: number };

const MIN_WINDOW_MENTIONS = 6; // fewer than this in either window and a "trend" is just noise
const round1 = (n: number) => Math.round(n * 10) / 10;
const monthIndex = (m: string) => Number(m.slice(0, 4)) * 12 + Number(m.slice(5, 7)) - 1;

function negShare(points: Aspect["monthly"]): number | null {
  const count = points.reduce((s, p) => s + p.count, 0);
  return count < MIN_WINDOW_MENTIONS ? null : (points.reduce((s, p) => s + p.neg, 0) * 100) / count;
}

function change(a: Aspect): number | null {
  if (a.monthly.length === 0) return null;
  const last = Math.max(...a.monthly.map((p) => monthIndex(p.month)));
  const recent = negShare(a.monthly.filter((p) => monthIndex(p.month) > last - 3));
  const before = negShare(a.monthly.filter((p) => monthIndex(p.month) <= last - 3 && monthIndex(p.month) > last - 6));
  return recent === null || before === null ? null : round1(recent - before);
}

/** Aspects with at least one complaint, most complaints first. `totalReviews` is the shop's. */
export function findIssues(aspects: Aspect[], totalReviews: number): Issue[] {
  return aspects
    .map((a) => {
      const complaints = a.monthly.reduce((s, p) => s + p.neg, 0);
      const negReasons = (a.reasons ?? []).filter((r) => r.tone === "negative");
      return {
        aspectId: a.id,
        name: a.name,
        complaints,
        reachPct: totalReviews ? round1((complaints * 100) / totalReviews) : 0,
        negPct: a.negPct,
        change: change(a),
        words: negReasons.map((r) => r.text),
        reviewIds: [...new Set([...negReasons.flatMap((r) => r.quoteReviewIds), ...a.exampleReviewIds])],
      };
    })
    .filter((i) => i.complaints > 0)
    .sort((x, y) => y.complaints - x.complaints || x.name.localeCompare(y.name));
}

/** How much fixing it would matter: how many customers raise it × how negative they are about
 *  it × how fast it's getting worse. Only a rise counts: an improving problem keeps its size. */
function score(i: Issue): number {
  return i.reachPct * (i.negPct / 100) * (1 + Math.max(0, i.change ?? 0) / 100);
}

/** The issues worth fixing first, highest impact first; impact is scaled so the top one is 100. */
export function rankFixFirst(issues: Issue[], limit = 5): RankedIssue[] {
  const scored = issues.map((i) => ({ issue: i, s: score(i) })).sort((a, b) => b.s - a.s).slice(0, limit);
  const top = scored[0]?.s ?? 0;
  return scored.map(({ issue, s }) => ({ ...issue, impact: top > 0 ? Math.max(1, Math.round((s / top) * 100)) : 0 }));
}

// A first step for the usual categories (aspects/categories.py and the mock shops). These are
// starting points to discuss, not findings: the reviews shown with each one are the evidence.
const SUGGESTIONS: Record<string, string> = {
  food: "Taste-test the dishes named in complaints and check recipes and holding times at the pass.",
  drinks: "Review the drinks named in complaints: recipe, temperature and how long they wait before serving.",
  service: "Brief staff on the moments customers mention, and add a quick check-in at each table or counter.",
  "wait-time": "Measure waits at peak hours, then add staff or a booking/queue system where the waits are longest.",
  ambience: "Fix the specific things named (noise, seating, lighting) in the busiest areas first.",
  price: "Check whether complaints are about value or price: better portions or clearer pricing often help more than discounts.",
  cleanliness: "Add a visible cleaning checklist for tables and washrooms, checked every hour at peak times.",
  hygiene: "Add a visible cleaning checklist and change towels and tools between every customer.",
  portions: "Compare portion sizes with what the menu or photos promise, and standardise them.",
  freshness: "Tighten stock rotation for the items named and check produce on arrival and before it ships.",
  stock: "Track which items run out most often and raise their reorder levels.",
  delivery: "Find where the delays happen (packing, dispatch or courier) and give customers honest time slots.",
  packaging: "Pack fragile and cold items separately and test the packaging on the most damaged products.",
  checkout: "Watch the checkout at busy times and remove the step that causes the most failures or waiting.",
  build: "Pass the specific faults to the supplier and inspect those models before dispatch.",
  performance: "Collect model numbers from the complaints and check whether one product causes most of them.",
  installation: "Set a booking window for installations and confirm the visit the day before.",
  warranty: "Publish a simple claims process with a response-time promise, and track open claims weekly.",
  energy: "Show energy ratings clearly on product pages so expectations match.",
  noise: "Check the noisiest models named in reviews and note noise levels on product pages.",
  fit: "Add a measured size chart and fit notes to each product page.",
  quality: "Check the fabric and stitching faults named with the supplier before the next order.",
  returns: "Make returns simpler: one form, a prepaid label and a refund-time promise.",
  results: "Show photos and a consultation step so customers and staff agree on the result before starting.",
  staff: "Brief staff on the moments customers mention, and ask for feedback at the end of each visit.",
};

export function suggestionFor(aspectId: string, name: string): string {
  return (
    SUGGESTIONS[aspectId] ??
    `Read the complaints about ${name.toLowerCase()} below, list the specific problems they name, and fix the most common one first.`
  );
}
