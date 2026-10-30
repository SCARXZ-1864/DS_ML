import type { Headline, ShopType, Tone } from "../schemas";

// Hand-written definitions for the 3 public demo shops and 2 owner shops.
// Numbers are shares (0..1). build.ts turns these into monthly data with a seeded RNG.

export type AspectDef = {
  id: string;
  name: string;
  group: string;
  share: number; // fraction of reviews that mention this aspect
  neg: number; // starting negative share of mentions
  pos: number; // starting positive share of mentions
  drift: number; // how much the negative share grows across the period
  isNew?: boolean; // only appears in the last quarter of the period
};

export type ReviewDef = {
  id: string;
  date: string;
  stars: number | null;
  text: string;
  sentiment: Tone;
  mentions: [aspectId: string, phrase: string, sentiment: Tone][];
};

export type ShopDef = {
  id: string;
  name: string;
  type: ShopType;
  isDemo: boolean;
  from: string;
  months: number;
  baseVolume: number;
  growth: number;
  posBase: number;
  negBase: number;
  negTrend: number;
  hasStars: boolean;
  headline: Headline;
  aspects: AspectDef[];
  reviews: ReviewDef[];
  unreadAlerts: number;
  lastUploadAt?: string;
};

export const SHOP_DEFS: ShopDef[] = [
  {
    id: "saffron-table", name: "Saffron Table", type: "restaurant", isDemo: true,
    from: "2023-11", months: 36, baseVolume: 190, growth: 0.4, posBase: 0.72, negBase: 0.16, negTrend: 0.05,
    hasStars: true, unreadAlerts: 0,
    headline: { parts: [{ text: "Diners love the food, but " }, { text: "weekend wait times", tone: "negative" }, { text: " drag ratings down." }] },
    aspects: [
      { id: "food", name: "Food", group: "product", share: 0.55, neg: 0.1, pos: 0.8, drift: 0.02 },
      { id: "service", name: "Service", group: "service", share: 0.35, neg: 0.2, pos: 0.62, drift: 0.03 },
      { id: "wait-time", name: "Wait time", group: "service", share: 0.22, neg: 0.4, pos: 0.2, drift: 0.12 },
      { id: "ambience", name: "Ambience", group: "place", share: 0.18, neg: 0.1, pos: 0.66, drift: 0 },
      { id: "price", name: "Price", group: "price", share: 0.2, neg: 0.24, pos: 0.46, drift: 0.03 },
      { id: "cleanliness", name: "Cleanliness", group: "place", share: 0.1, neg: 0.1, pos: 0.58, drift: -0.02 },
    ],
    reviews: [
      { id: "st-r1", date: "2026-09-14", stars: 2, sentiment: "negative", text: "The biryani was excellent but we waited 50 minutes on a Saturday even with a booking.", mentions: [["food", "biryani", "positive"], ["wait-time", "waited 50 minutes", "negative"]] },
      { id: "st-r2", date: "2026-08-02", stars: 5, sentiment: "positive", text: "Lovely ambience and the service was warm and quick.", mentions: [["ambience", "ambience", "positive"], ["service", "service", "positive"]] },
      { id: "st-r3", date: "2026-07-21", stars: 2, sentiment: "negative", text: "Felt overpriced for the portion size.", mentions: [["price", "overpriced", "negative"]] },
      { id: "st-r4", date: "2026-06-10", stars: 1, sentiment: "negative", text: "Staff ignored us for twenty minutes and the table was sticky.", mentions: [["service", "Staff ignored us", "negative"], ["cleanliness", "table was sticky", "negative"]] },
      { id: "st-r5", date: "2025-12-30", stars: 5, sentiment: "positive", text: "Best paneer tikka in town, fair price too.", mentions: [["food", "paneer tikka", "positive"], ["price", "fair price", "positive"]] },
      { id: "st-r6", date: "2026-10-05", stars: 3, sentiment: "neutral", text: "Food is great, but the wait at the door kills the evening.", mentions: [["food", "Food", "positive"], ["wait-time", "the wait at the door", "negative"]] },
    ],
  },
  {
    id: "freshcart", name: "FreshCart Grocery", type: "grocery", isDemo: true,
    from: "2023-11", months: 36, baseVolume: 330, growth: 0.35, posBase: 0.68, negBase: 0.19, negTrend: 0.05,
    hasStars: true, unreadAlerts: 0,
    headline: { parts: [{ text: "Shoppers praise the prices, but " }, { text: "produce freshness", tone: "negative" }, { text: " complaints are rising." }] },
    aspects: [
      { id: "freshness", name: "Freshness", group: "product", share: 0.4, neg: 0.3, pos: 0.45, drift: 0.15 },
      { id: "price", name: "Price", group: "price", share: 0.35, neg: 0.1, pos: 0.72, drift: 0 },
      { id: "stock", name: "Stock availability", group: "product", share: 0.22, neg: 0.28, pos: 0.38, drift: 0.03 },
      { id: "delivery", name: "Delivery", group: "delivery", share: 0.3, neg: 0.24, pos: 0.5, drift: 0.02 },
      { id: "packaging", name: "Packaging", group: "delivery", share: 0.12, neg: 0.14, pos: 0.52, drift: 0 },
      { id: "checkout", name: "Checkout", group: "service", share: 0.15, neg: 0.16, pos: 0.47, drift: -0.02 },
    ],
    reviews: [
      { id: "fc-r1", date: "2026-10-03", stars: 1, sentiment: "negative", text: "The spinach was already wilted and the tomatoes were mushy.", mentions: [["freshness", "spinach was already wilted", "negative"]] },
      { id: "fc-r2", date: "2026-09-11", stars: 5, sentiment: "positive", text: "Prices are lower than the supermarket next door.", mentions: [["price", "Prices are lower", "positive"]] },
      { id: "fc-r3", date: "2026-08-19", stars: 2, sentiment: "negative", text: "Half my list was out of stock again.", mentions: [["stock", "out of stock", "negative"]] },
      { id: "fc-r4", date: "2026-07-07", stars: 4, sentiment: "positive", text: "Delivery arrived on time and the eggs were packed well.", mentions: [["delivery", "Delivery arrived on time", "positive"], ["packaging", "packed well", "positive"]] },
      { id: "fc-r5", date: "2026-05-28", stars: 2, sentiment: "negative", text: "Self checkout kept freezing, had to queue for ages.", mentions: [["checkout", "Self checkout kept freezing", "negative"]] },
      { id: "fc-r6", date: "2026-09-30", stars: 2, sentiment: "negative", text: "Bread was stale two days before the date.", mentions: [["freshness", "Bread was stale", "negative"]] },
    ],
  },
  {
    id: "volthome", name: "VoltHome Appliances", type: "electronics", isDemo: true,
    from: "2023-11", months: 36, baseVolume: 150, growth: 0.5, posBase: 0.7, negBase: 0.18, negTrend: 0.04,
    hasStars: true, unreadAlerts: 0,
    headline: { parts: [{ text: "Products rate well, but " }, { text: "installation delays", tone: "negative" }, { text: " cause most 1★ reviews." }] },
    aspects: [
      { id: "build", name: "Build quality", group: "product", share: 0.4, neg: 0.12, pos: 0.74, drift: 0 },
      { id: "delivery", name: "Delivery", group: "delivery", share: 0.3, neg: 0.27, pos: 0.45, drift: 0.03 },
      { id: "installation", name: "Installation", group: "service", share: 0.25, neg: 0.4, pos: 0.25, drift: 0.1 },
      { id: "warranty", name: "Warranty", group: "service", share: 0.15, neg: 0.24, pos: 0.4, drift: 0.02 },
      { id: "energy", name: "Energy use", group: "product", share: 0.12, neg: 0.08, pos: 0.57, drift: 0 },
      { id: "noise", name: "Noise", group: "product", share: 0.14, neg: 0.19, pos: 0.41, drift: 0.01 },
    ],
    reviews: [
      { id: "vh-r1", date: "2026-10-08", stars: 1, sentiment: "negative", text: "Fridge is fine but installation was postponed three times.", mentions: [["installation", "installation was postponed", "negative"]] },
      { id: "vh-r2", date: "2026-09-02", stars: 5, sentiment: "positive", text: "Solid build quality and it barely uses any power.", mentions: [["build", "Solid build quality", "positive"], ["energy", "barely uses any power", "positive"]] },
      { id: "vh-r3", date: "2026-08-15", stars: 2, sentiment: "negative", text: "The washing machine is loud on spin cycle.", mentions: [["noise", "loud on spin cycle", "negative"]] },
      { id: "vh-r4", date: "2026-07-25", stars: 2, sentiment: "negative", text: "Warranty claim took six weeks to get a technician.", mentions: [["warranty", "Warranty claim took six weeks", "negative"]] },
      { id: "vh-r5", date: "2026-06-18", stars: 1, sentiment: "negative", text: "Delivery came a week late and the box was dented.", mentions: [["delivery", "Delivery came a week late", "negative"]] },
    ],
  },
  {
    id: "spice-indiranagar", name: "Spice Route · Indiranagar", type: "restaurant", isDemo: false,
    from: "2024-11", months: 24, baseVolume: 70, growth: 0.3, posBase: 0.74, negBase: 0.15, negTrend: 0.03,
    hasStars: true, unreadAlerts: 2, lastUploadAt: "2026-10-12",
    headline: { parts: [{ text: "Regulars rave about the " }, { text: "biryani", tone: "positive" }, { text: ", but " }, { text: "delivery packaging", tone: "negative" }, { text: " complaints doubled this month." }] },
    aspects: [
      { id: "food", name: "Food", group: "product", share: 0.55, neg: 0.09, pos: 0.84, drift: 0 },
      { id: "service", name: "Service", group: "service", share: 0.3, neg: 0.18, pos: 0.66, drift: 0 },
      { id: "wait-time", name: "Wait time", group: "service", share: 0.15, neg: 0.27, pos: 0.4, drift: 0 },
      { id: "packaging", name: "Packaging", group: "delivery", share: 0.2, neg: 0.2, pos: 0.4, drift: 0.25 },
      { id: "price", name: "Price", group: "price", share: 0.18, neg: 0.21, pos: 0.49, drift: 0 },
      { id: "ambience", name: "Ambience", group: "place", share: 0.12, neg: 0.08, pos: 0.7, drift: 0 },
      { id: "spice", name: "Spice level", group: "product", share: 0.1, neg: 0.2, pos: 0.5, drift: 0, isNew: true },
    ],
    reviews: [
      { id: "si-r1", date: "2026-10-04", stars: 2, sentiment: "negative", text: "Box arrived crushed and the gravy leaked everywhere.", mentions: [["packaging", "Box arrived crushed", "negative"]] },
      { id: "si-r2", date: "2026-10-06", stars: 5, sentiment: "positive", text: "Biryani was perfect, best in the area.", mentions: [["food", "Biryani", "positive"]] },
      { id: "si-r3", date: "2026-10-09", stars: 3, sentiment: "neutral", text: "Food is great but please fix the containers, third time it's spilled.", mentions: [["food", "Food is great", "positive"], ["packaging", "fix the containers", "negative"]] },
      { id: "si-r4", date: "2026-09-20", stars: 4, sentiment: "positive", text: "A bit too spicy for my kids, otherwise lovely.", mentions: [["spice", "too spicy", "negative"]] },
      { id: "si-r5", date: "2026-08-14", stars: 2, sentiment: "negative", text: "Waited 40 minutes for a table on Friday.", mentions: [["wait-time", "Waited 40 minutes", "negative"]] },
    ],
  },
  {
    id: "spice-koramangala", name: "Spice Route · Koramangala", type: "restaurant", isDemo: false,
    from: "2024-11", months: 24, baseVolume: 55, growth: 0.25, posBase: 0.68, negBase: 0.2, negTrend: 0.02,
    hasStars: true, unreadAlerts: 0, lastUploadAt: "2026-10-03",
    headline: { parts: [{ text: "Food quality matches Indiranagar, but " }, { text: "wait time", tone: "negative" }, { text: " is this branch's biggest problem." }] },
    aspects: [
      { id: "food", name: "Food", group: "product", share: 0.55, neg: 0.11, pos: 0.8, drift: 0 },
      { id: "service", name: "Service", group: "service", share: 0.3, neg: 0.24, pos: 0.58, drift: 0 },
      { id: "wait-time", name: "Wait time", group: "service", share: 0.25, neg: 0.41, pos: 0.25, drift: 0.04 },
      { id: "packaging", name: "Packaging", group: "delivery", share: 0.15, neg: 0.22, pos: 0.35, drift: 0 },
      { id: "price", name: "Price", group: "price", share: 0.18, neg: 0.23, pos: 0.46, drift: 0 },
      { id: "ambience", name: "Ambience", group: "place", share: 0.12, neg: 0.14, pos: 0.6, drift: 0 },
    ],
    reviews: [
      { id: "sk-r1", date: "2026-09-27", stars: 1, sentiment: "negative", text: "Waited an hour for our mains on a weeknight.", mentions: [["wait-time", "Waited an hour", "negative"]] },
      { id: "sk-r2", date: "2026-09-05", stars: 5, sentiment: "positive", text: "Same great biryani as the Indiranagar branch.", mentions: [["food", "great biryani", "positive"]] },
      { id: "sk-r3", date: "2026-08-22", stars: 2, sentiment: "negative", text: "Service was slow and nobody checked on us.", mentions: [["service", "Service was slow", "negative"]] },
      { id: "sk-r4", date: "2026-07-30", stars: 3, sentiment: "neutral", text: "Decent food but pricey for what you get.", mentions: [["food", "Decent food", "positive"], ["price", "pricey", "negative"]] },
    ],
  },
];
