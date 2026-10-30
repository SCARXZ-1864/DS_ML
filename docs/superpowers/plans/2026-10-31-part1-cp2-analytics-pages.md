# Part 1 · Checkpoint 2: Analytics Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the Topics, Aspects (with a reviews drawer), Reviews, Ask and Try it pages plus a Ctrl+K command palette to `web/`, all running on deterministic mock data through the existing `DataSource` contract.

**Architecture:**
- **Data contract and mock source.** Both grow to cover topics, paginated reviews, a streamed chat answer and a live prediction.
- **Three API routes.** Interactive features call `/api/shops/[shopId]/{reviews,ask,predict}` (the backend-for-frontend). The routes validate input with zod, use the existing error contract, and stream chat answers as NDJSON (one JSON object per line).
- **Page pattern.** Pages keep the Checkpoint 1 pattern: a server component reads `params` inside `<Suspense>`, loads data through `@/lib/data`, and passes plain data to one client view.

**Tech Stack:**
- Existing: Next.js 16.4.1 (`cacheComponents: true`), React 19, Tailwind 4, zod 4, d3-scale/d3-shape, vitest + React Testing Library + jsdom.
- New: `d3-force` (bubble layout), `motion` (list reordering), `cmdk` (command palette).

**Spec:** `docs/superpowers/specs/2026-10-30-frontend-mock-design.md`

**Deliberate deviations from the spec (kept small):**
- **cmdk instead of the shadcn Command component.** `cmdk` is the library shadcn's Command wraps. Using it directly avoids the shadcn CLI rewriting `globals.css` with its own colour variables, which would clash with the Tropical tokens.
- **Aspect drawer uses the native `<dialog>` element.** It gives a focus trap, Esc-to-close and a background the user can't interact with, all for free, with no Dialog dependency.
- **Mock topics are derived one per aspect.** Each has keywords and its complaint share. In Part 2, BERTopic produces real topics that won't map 1:1 to aspects.
- **Topic bubbles are placed by a fixed-tick d3-force run.** They then "pop" in with a CSS scale animation instead of a live physics animation. The layout is deterministic and the motion is cheap.
- **The Aspects page shows all-time numbers.** Range filtering stays on the Overview.
- **Cited reviews are sent to the Ask page with the page load.** Mock shops have about 55 reviews, so this is small. Citations stay `{ type: "citation", reviewId }` as the contract says.
- **Generated mock reviews use simple templates** ("Disappointed with the {aspect}…"). They stand in for real text until Part 2.

## Global Constraints

- **Workspace:** work in `C:\dev\review-intel\web` on branch `feat/frontend-mock`. Use `pnpm` only.
- **Next.js 16 with `cacheComponents: true`:**
  - Never `await params`, `cookies()` or `headers()` at the top level of a page or layout. Do it in a child component inside `<Suspense>`.
  - Route handlers type their second argument as `RouteContext<"/api/...">` and `await ctx.params`.
  - `error.tsx` receives `retry`.
- **Colours come only from the CSS tokens** (`bg`, `panel`, `panel-2`, `line`, `ink`, `muted`, `pos`, `neg`, `accent`, `info`). No hex values in `src/components/**`; `src/test/tokens.test.ts` enforces this.
- **No shop-type-specific wording in components.** Aspect names, suggestions and examples come from data.
- **Client components (`"use client"`) never import `@/lib/data` (the index) or `@/lib/data/mock/*`.** They may import from `@/lib/data/schemas`, `@/lib/data/derive`, `@/lib/format`, `@/lib/highlight` and `@/lib/ndjson`.
- **Every API error uses the contract** `{ "error": { "code", "message", "request_id" } }` with an `x-request-id` header (`docs/ENGINEERING.md` §3). Codes used here: `VALIDATION_ERROR` (400), `NOT_FOUND` (404), `INTERNAL_ERROR` (500).
- **Input limits:**
  - questions: 1–500 characters after trimming
  - "Try it" text: 1–2,000 characters
  - review search: up to 200 characters
  - page size: 1–50 (default 20)
- **Waiting and motion:**
  - Show "Waking the model…" when Ask or Try it gets no response within 1.5 s.
  - Debounces: 400 ms for Try it typing, 300 ms for review search.
  - Every animation is ≤ 0.7 s and respects `prefers-reduced-motion`.
- **Tests:** component tests start with `// @vitest-environment jsdom`. Mock `fetch` with `vi.stubGlobal("fetch", …)` and restore it with `vi.unstubAllGlobals()`.
- **Commits:**
  - Small, `type: description` messages ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Never use `--no-verify`.
  - After every commit, run the mirror script: `powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\HP\OneDrive\Desktop\Academics\PROJECTS\DS_ML_MODEL\.claude\mirror-review-intel.ps1"`
- **Errors:** capture the error → state the root cause in 2–3 sentences → apply the smallest fix → re-run → log it in `ERROR_LOG.md`. After 3 failed attempts on the same error, stop and ask.
- **Installs:** don't install anything beyond `d3-force`, `@types/d3-force`, `motion` and `cmdk` without asking.
- **Memory:** the machine is low on RAM. Run `pnpm build` once, in Task 12, and never alongside `pnpm dev`.

## Review Focus

1. **Off-topic or unanswerable questions** ("What's the weather tomorrow?"). The user should get a polite decline that suggests real topics, with no citations. Pinned in Task 3 (`composeAnswer` decline test).
2. **Server errors or a broken stream on Ask, Try it or Reviews.** The user should get a visible error with a retry, never a spinner that spins forever. Pinned in Tasks 8, 9 and 10.
3. **Fast filter changes on Reviews,** where an earlier slow response arrives after a later one. Only the latest filters' results should show. Pinned in Task 8 (abort test).
4. **Filters that match no reviews.** The user should get an empty state with "Clear filters". Pinned in Task 8.
5. **Blank or over-long input** (a question over 500 characters, review text over 2,000, a malformed JSON body). The server should answer `400 VALIDATION_ERROR` with a readable message, and the client should keep submit disabled for blank input. Pinned in Tasks 4, 9 and 10.

---

## File map

```
web/
  package.json                                   modify: d3-force, motion, cmdk (Tasks 7, 8, 11)
  src/test/setup.ts                              modify: jsdom stubs for dialog, matchMedia, scrollIntoView, ResizeObserver (Task 6)
  src/app/globals.css                            modify: drawer + pop keyframes (Tasks 6, 7)
  src/lib/data/schemas.ts(+test)                 modify: Topic, ReviewQuery, ReviewPage, ChatChunk, Prediction, request schemas (Task 1)
  src/lib/data/mock/keywords.ts                  create: aspect keywords (Task 2)
  src/lib/data/mock/generate.ts                  create: templated reviews (Task 2)
  src/lib/data/mock/topics.ts                    create: topic derivation (Task 2)
  src/lib/data/mock/query.ts(+test)              create: filter/sort/paginate reviews (Task 2)
  src/lib/data/mock/build.ts                     modify: generated reviews + topics (Task 2)
  src/lib/data/mock/ask.ts(+test)                create: answer composer + streamer (Task 3)
  src/lib/data/mock/predict.ts(+test)            create: lexicon predictor (Task 3)
  src/lib/data/mock/index.ts                     modify: new DataSource methods (Tasks 2, 3)
  src/lib/data/index.ts                          modify: DataSource interface (Tasks 2, 3)
  src/lib/data/mock/mock.test.ts                 modify: contract tests for new data (Tasks 2, 3)
  src/lib/data/derive.ts(+test)                  modify: suggestedQuestions, tryExamples (Task 9, Task 10)
  src/lib/api.ts(+test)                          create: error responses (Task 4)
  src/app/api/shops/[shopId]/reviews/route.ts(+test)   create (Task 4)
  src/app/api/shops/[shopId]/ask/route.ts(+test)       create (Task 4)
  src/app/api/shops/[shopId]/predict/route.ts(+test)   create (Task 4)
  docs/ENGINEERING.md (repo root)                modify: NOT_FOUND code (Task 4)
  src/lib/format.ts(+test)                       modify: fmtDate (Task 5)
  src/lib/highlight.ts(+test)                    create: segmentText (Task 5)
  src/components/shop/HighlightedText.tsx        create (Task 5)
  src/components/shop/ReviewCard.tsx(+test)      create (Task 5)
  src/components/shop/PageHeader.tsx             create (Task 6)
  src/components/shop/PageSkeleton.tsx           create (Task 6)
  src/components/charts/AspectBars.tsx(+test)    modify: optional onSelect (Task 6)
  src/components/shop/AspectDrawer.tsx           create (Task 6)
  src/components/shop/AspectsView.tsx(+test)     create (Task 6)
  src/app/(app)/shops/[shopId]/aspects/page.tsx  create (Task 6)
  src/components/shop/shop-nav.ts                modify: one entry per page (Tasks 6–10)
  src/components/charts/bubble-layout.ts(+test)  create (Task 7)
  src/components/charts/Sparkline.tsx            create (Task 7)
  src/components/charts/TopicBubbles.tsx         create (Task 7)
  src/components/shop/TopicsView.tsx(+test)      create (Task 7)
  src/app/(app)/shops/[shopId]/topics/page.tsx   create (Task 7)
  src/components/shop/ReviewExplorer.tsx(+test)  create (Task 8)
  src/app/(app)/shops/[shopId]/reviews/page.tsx  create (Task 8)
  src/lib/ndjson.ts(+test)                       create (Task 9)
  src/components/chat/ChatPanel.tsx(+test)       create (Task 9)
  src/app/(app)/shops/[shopId]/ask/page.tsx      create (Task 9)
  src/components/charts/SentimentGauge.tsx       create (Task 10)
  src/components/try/LiveAnalyzer.tsx(+test)     create (Task 10)
  src/app/(app)/shops/[shopId]/try/page.tsx      create (Task 10)
  src/components/shop/CommandPalette.tsx(+test)  create (Task 11)
  src/components/shop/Sidebar.tsx(+test)         modify: mount palette (Task 11)
README.md, ERROR_LOG.md                          modify (Task 12)
```

All commands run from `C:\dev\review-intel\web` unless stated otherwise.

---

### Task 1: Extend the data contract

**Files:**
- Modify: `web/src/lib/data/schemas.ts` (append after the existing `ReviewSchema`, keeping the type exports at the bottom)
- Test: `web/src/lib/data/schemas.test.ts` (append a new `describe`)

**Interfaces:**
- Consumes: the existing `ToneSchema`, `MonthPointSchema`, `ReviewSchema` and the `count` helper in `schemas.ts`.
- Produces:
  - Schemas: `TopicSchema`, `ReviewSortSchema`, `ReviewQuerySchema`, `ReviewPageSchema`, `ChatChunkSchema`, `PredictionSchema`, `AskRequestSchema`, `PredictRequestSchema`.
  - Types: `Topic`, `ReviewSort`, `ReviewQuery` (parsed output: `sort` and `limit` always set), `ReviewPage`, `ChatChunk`, `Prediction`.

- [ ] **Step 1: Write the failing tests.** Append this to `web/src/lib/data/schemas.test.ts`:

```ts
import {
  AskRequestSchema, ChatChunkSchema, PredictRequestSchema, PredictionSchema, ReviewQuerySchema, TopicSchema,
} from "./schemas";

describe("checkpoint 2 contract", () => {
  it("fills review query defaults", () => {
    expect(ReviewQuerySchema.parse({})).toEqual({ sort: "newest", limit: 20 });
  });

  it("coerces query-string numbers", () => {
    expect(ReviewQuerySchema.parse({ stars: "2", limit: "10", cursor: "40" })).toMatchObject({ stars: 2, limit: 10, cursor: "40" });
  });

  it("rejects out-of-range or unknown query values", () => {
    expect(ReviewQuerySchema.safeParse({ limit: "500" }).success).toBe(false);
    expect(ReviewQuerySchema.safeParse({ sentiment: "angry" }).success).toBe(false);
    expect(ReviewQuerySchema.safeParse({ cursor: "abc" }).success).toBe(false);
    expect(ReviewQuerySchema.safeParse({ search: "x".repeat(201) }).success).toBe(false);
  });

  it("accepts each chat chunk type and rejects unknown ones", () => {
    expect(ChatChunkSchema.parse({ type: "citation", reviewId: "r1" })).toEqual({ type: "citation", reviewId: "r1" });
    expect(ChatChunkSchema.parse({ type: "done" })).toEqual({ type: "done" });
    expect(ChatChunkSchema.safeParse({ type: "image", url: "x" }).success).toBe(false);
  });

  it("trims and limits request text", () => {
    expect(AskRequestSchema.parse({ question: "  Why?  " }).question).toBe("Why?");
    expect(AskRequestSchema.safeParse({ question: "   " }).success).toBe(false);
    expect(AskRequestSchema.safeParse({ question: "q".repeat(501) }).success).toBe(false);
    expect(PredictRequestSchema.safeParse({ text: "t".repeat(2001) }).success).toBe(false);
  });

  it("bounds prediction scores and topic shares", () => {
    const prediction = { sentiment: "positive", score: 1.5, confidence: 0.9, tokens: [], aspects: [] };
    expect(PredictionSchema.safeParse(prediction).success).toBe(false);
    const topic = { id: "t", label: "T", keywords: ["k"], size: 3, negShare: 1.2, monthly: [], representativeReviewIds: [] };
    expect(TopicSchema.safeParse(topic).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail.**

Run: `pnpm exec vitest run src/lib/data/schemas.test.ts`

Expected: FAIL. The new imports (`ReviewQuerySchema` and the rest) are `undefined`, so you'll see errors like "Cannot read properties of undefined (reading 'parse')".

- [ ] **Step 3: Add the schemas.** Insert this into `web/src/lib/data/schemas.ts` just before the `export type ShopType` line:

```ts
export const TopicSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  keywords: z.array(z.string().min(1)).min(1),
  size: count,
  negShare: z.number().min(0).max(1),
  monthly: z.array(MonthPointSchema),
  representativeReviewIds: z.array(z.string()),
});

export const ReviewSortSchema = z.enum(["newest", "oldest", "lowest", "highest"]);

// Query parameters arrive as strings, so numbers are coerced. Callers drop empty values first.
export const ReviewQuerySchema = z.object({
  sentiment: ToneSchema.optional(),
  stars: z.coerce.number().int().min(1).max(5).optional(),
  aspectId: z.string().min(1).max(64).optional(),
  search: z.string().trim().max(200).optional(),
  sort: ReviewSortSchema.default("newest"),
  cursor: z.string().regex(/^\d+$/, "cursor must be a number").optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const ReviewPageSchema = z.object({
  items: z.array(ReviewSchema),
  nextCursor: z.string().nullable(),
  total: count,
});

export const ChatChunkSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), text: z.string() }),
  z.object({ type: z.literal("citation"), reviewId: z.string().min(1) }),
  z.object({ type: z.literal("done") }),
  z.object({ type: z.literal("error"), message: z.string().min(1) }),
]);

export const PredictionSchema = z.object({
  sentiment: ToneSchema,
  score: z.number().min(-1).max(1),
  confidence: z.number().min(0).max(1),
  tokens: z.array(z.object({ text: z.string(), tone: ToneSchema.optional(), aspectId: z.string().optional() })),
  aspects: z.array(z.object({ id: z.string().min(1), name: z.string().min(1), sentiment: ToneSchema })),
});

export const AskRequestSchema = z.object({
  question: z.string().trim().min(1, "Ask a question first").max(500, "Keep questions under 500 characters"),
});

export const PredictRequestSchema = z.object({
  text: z.string().trim().min(1, "Type a review first").max(2000, "Reviews are limited to 2,000 characters"),
});
```

Then add these type exports at the end of the file:

```ts
export type Topic = z.infer<typeof TopicSchema>;
export type ReviewSort = z.infer<typeof ReviewSortSchema>;
export type ReviewQuery = z.infer<typeof ReviewQuerySchema>;
export type ReviewPage = z.infer<typeof ReviewPageSchema>;
export type ChatChunk = z.infer<typeof ChatChunkSchema>;
export type Prediction = z.infer<typeof PredictionSchema>;
```

- [ ] **Step 4: Run the tests and confirm they pass.**

Run: `pnpm exec vitest run src/lib/data/schemas.test.ts`

Expected: PASS (7 existing tests plus 6 new).

- [ ] **Step 5: Commit, then run the mirror script.**

```bash
git add src/lib/data/schemas.ts src/lib/data/schemas.test.ts
git commit -m "feat(web): contract for topics, review pages, chat chunks and predictions" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: More mock reviews, topics and paginated review queries

**Files:**
- Create: `web/src/lib/data/mock/keywords.ts`, `web/src/lib/data/mock/generate.ts`, `web/src/lib/data/mock/topics.ts`, `web/src/lib/data/mock/query.ts`
- Modify: `web/src/lib/data/mock/build.ts`, `web/src/lib/data/mock/index.ts`, `web/src/lib/data/index.ts`
- Test: `web/src/lib/data/mock/query.test.ts` (new) and `web/src/lib/data/mock/mock.test.ts` (append)

**Interfaces:**
- Consumes:
  - Task 1 types `Topic`, `ReviewQuery`, `ReviewPage`, `ReviewSort`.
  - `ShopDef` and `AspectDef` from `shops.ts`.
  - `mulberry32` and `seedFrom` from `rng.ts`.
- Produces:
  - `ASPECT_KEYWORDS: Record<string, string[]>`
  - `generateReviews(def: ShopDef, months: string[], count?: number): Review[]`
  - `deriveTopics(aspects: Aspect[], reviews: Review[]): Topic[]`
  - `queryReviews(reviews: Review[], q: ReviewQuery): ReviewPage`
  - `ShopEntry` gains `topics: Topic[]`.
  - New `DataSource` methods: `getTopics(id: string): Promise<Topic[] | null>` and `getReviews(id: string, query: ReviewQuery): Promise<ReviewPage | null>`.

- [ ] **Step 1: Write the failing tests**

Create `web/src/lib/data/mock/query.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { ReviewQuerySchema, type Review } from "../schemas";
import { queryReviews } from "./query";

const r = (id: string, date: string, stars: number | null, sentiment: Review["sentiment"], text: string, aspectId = "a"): Review => ({
  id, date, stars, text, sentiment, confidence: 0.9, aspectMentions: [{ aspectId, start: 0, end: 1, sentiment }],
});
const reviews = [
  r("1", "2026-01-05", 5, "positive", "Lovely food"),
  r("2", "2026-03-10", 1, "negative", "Cold FOOD and slow", "b"),
  r("3", "2026-02-01", 3, "neutral", "Okay"),
  r("4", "2026-04-20", 2, "negative", "Rude staff", "b"),
];
const q = (input: Record<string, unknown> = {}) => ReviewQuerySchema.parse(input);

describe("queryReviews", () => {
  it("sorts newest first by default and reports the total", () => {
    const page = queryReviews(reviews, q());
    expect(page.items.map((x) => x.id)).toEqual(["4", "2", "3", "1"]);
    expect(page.total).toBe(4);
    expect(page.nextCursor).toBeNull();
  });

  it("filters by sentiment, stars and aspect", () => {
    expect(queryReviews(reviews, q({ sentiment: "negative" })).items.map((x) => x.id)).toEqual(["4", "2"]);
    expect(queryReviews(reviews, q({ stars: 3 })).items.map((x) => x.id)).toEqual(["3"]);
    expect(queryReviews(reviews, q({ aspectId: "b" })).total).toBe(2);
  });

  it("searches text case-insensitively", () => {
    expect(queryReviews(reviews, q({ search: "food" })).items.map((x) => x.id)).toEqual(["2", "1"]);
  });

  it("sorts by lowest and highest stars", () => {
    expect(queryReviews(reviews, q({ sort: "lowest" })).items[0].id).toBe("2");
    expect(queryReviews(reviews, q({ sort: "highest" })).items[0].id).toBe("1");
  });

  it("paginates with a cursor", () => {
    const first = queryReviews(reviews, q({ limit: 3 }));
    expect(first.items).toHaveLength(3);
    expect(first.nextCursor).toBe("3");
    const second = queryReviews(reviews, q({ limit: 3, cursor: first.nextCursor! }));
    expect(second.items.map((x) => x.id)).toEqual(["1"]);
    expect(second.nextCursor).toBeNull();
  });

  it("returns an empty page when nothing matches", () => {
    expect(queryReviews(reviews, q({ search: "zebra" }))).toEqual({ items: [], nextCursor: null, total: 0 });
  });
});
```

Then append this to the `describe("mock data", …)` block in `web/src/lib/data/mock/mock.test.ts`, and add `ReviewPageSchema, TopicSchema, ReviewQuerySchema` to its `../schemas` import:

```ts
  it.each(SHOP_DEFS.map((d) => d.id))("%s has topics and paginated reviews that follow the contract", async (id) => {
    const topics = (await ds.getTopics(id))!;
    expect(topics.length).toBeGreaterThan(3);
    topics.forEach((t) => TopicSchema.parse(t));
    expect(topics.map((t) => t.size)).toEqual([...topics.map((t) => t.size)].sort((a, b) => b - a));
    const page = ReviewPageSchema.parse(await ds.getReviews(id, ReviewQuerySchema.parse({})));
    expect(page.total).toBeGreaterThanOrEqual(40);
    expect(page.items).toHaveLength(20);
  });

  it("returns null topics and reviews for an unknown shop", async () => {
    expect(await ds.getTopics("no-such-shop")).toBeNull();
    expect(await ds.getReviews("no-such-shop", ReviewQuerySchema.parse({}))).toBeNull();
  });

  it("only generates reviews for a new aspect in the months it exists", async () => {
    const page = (await ds.getReviews("spice-indiranagar", ReviewQuerySchema.parse({ aspectId: "spice", limit: 50 })))!;
    expect(page.total).toBeGreaterThan(0);
    page.items.forEach((r) => expect(r.date >= "2026-05").toBe(true));
  });
```

- [ ] **Step 2: Run the tests and confirm they fail.**

Run: `pnpm exec vitest run src/lib/data/mock`

Expected: FAIL. You'll see "Cannot find module './query'", and in `mock.test.ts` `ds.getTopics is not a function`.

- [ ] **Step 3: Create `web/src/lib/data/mock/keywords.ts`**

```ts
// Words customers use for each aspect (by aspect id). They feed topic keywords,
// the mock chat's question matching and the mock "Try it" predictor.
export const ASPECT_KEYWORDS: Record<string, string[]> = {
  food: ["taste", "dish", "flavour", "portion"],
  service: ["staff", "waiter", "friendly", "rude"],
  "wait-time": ["wait", "queue", "minutes", "slow"],
  ambience: ["music", "decor", "seating", "vibe"],
  price: ["price", "value", "expensive", "cheap"],
  cleanliness: ["clean", "table", "hygiene", "sticky"],
  freshness: ["fresh", "wilted", "stale", "expiry"],
  stock: ["stock", "available", "missing", "shelf"],
  delivery: ["delivery", "late", "driver", "arrived"],
  packaging: ["box", "container", "leaked", "packed"],
  checkout: ["checkout", "counter", "card", "till"],
  build: ["sturdy", "quality", "material", "solid"],
  installation: ["install", "technician", "postponed", "fitting"],
  warranty: ["warranty", "claim", "repair", "replacement"],
  energy: ["power", "energy", "bill", "efficient"],
  noise: ["noise", "loud", "quiet", "hum"],
  spice: ["spicy", "mild", "heat", "chilli"],
};
```

- [ ] **Step 4: Create `web/src/lib/data/mock/generate.ts`**

```ts
import type { Review, Tone } from "../schemas";
import { mulberry32, seedFrom } from "./rng";
import type { ShopDef } from "./shops";

// Templated reviews so every shop has enough rows to filter, sort and page through.
// "{a}" is replaced with the aspect name; it is never at the start of a sentence.
const TEMPLATES: Record<Tone, string[]> = {
  positive: [
    "Really happy with the {a} this time.",
    "The {a} was excellent, would come back for it.",
    "No complaints about the {a} at all.",
    "Loved the {a}, best in the area.",
    "The {a} has improved a lot lately.",
  ],
  negative: [
    "Disappointed with the {a} on my last visit.",
    "The {a} was a real letdown.",
    "Please fix the {a}, it keeps getting worse.",
    "Terrible {a}, not coming back.",
    "The {a} ruined an otherwise good experience.",
  ],
  neutral: ["The {a} was okay, nothing special.", "Average {a}, about what I expected."],
};

export function generateReviews(def: ShopDef, months: string[], count = 48): Review[] {
  const rnd = mulberry32(seedFrom(`${def.id}:generated`));
  const totalShare = def.aspects.reduce((s, a) => s + a.share, 0);
  const pickAspect = () => {
    let roll = rnd() * totalShare;
    for (const a of def.aspects) {
      roll -= a.share;
      if (roll <= 0) return a;
    }
    return def.aspects[def.aspects.length - 1];
  };

  return Array.from({ length: count }, (_, i) => {
    const a = pickAspect();
    const roll = rnd();
    const sentiment: Tone = roll < a.pos ? "positive" : roll < a.pos + a.neg ? "negative" : "neutral";
    const options = TEMPLATES[sentiment];
    const template = options[Math.floor(rnd() * options.length)];
    const name = a.name.toLowerCase();
    const start = template.indexOf("{a}");
    // New aspects only exist in the last quarter of the period; everything else uses the last year.
    const pool = a.isNew ? months.slice(-6) : months.slice(-12);
    const month = pool[Math.floor(rnd() * pool.length)];
    const day = String(1 + Math.floor(rnd() * 28)).padStart(2, "0");
    const stars = !def.hasStars
      ? null
      : sentiment === "positive" ? (rnd() < 0.7 ? 5 : 4) : sentiment === "negative" ? (rnd() < 0.65 ? 1 : 2) : 3;
    return {
      id: `${def.id}-g${i + 1}`,
      date: `${month}-${day}`,
      stars,
      text: template.replace("{a}", name),
      sentiment,
      confidence: Math.round((0.6 + 0.39 * rnd()) * 100) / 100,
      helpful: Math.floor(rnd() * 30),
      aspectMentions: [{ aspectId: a.id, start, end: start + name.length, sentiment }],
    };
  });
}
```

- [ ] **Step 5: Create `web/src/lib/data/mock/topics.ts`**

```ts
import type { Aspect, Review, Topic } from "../schemas";
import { ASPECT_KEYWORDS } from "./keywords";

/** Mock topics: one per mentioned aspect. Part 2 replaces this with BERTopic clusters. */
export function deriveTopics(aspects: Aspect[], reviews: Review[]): Topic[] {
  return aspects
    .filter((a) => a.mentions > 0)
    .map((a) => {
      const keywords = ASPECT_KEYWORDS[a.id] ?? [a.name.toLowerCase()];
      const polar = a.posPct + a.negPct;
      return {
        id: `t-${a.id}`,
        label: `${a.name}: ${keywords.slice(0, 2).join(", ")}`,
        keywords,
        size: a.mentions,
        negShare: polar === 0 ? 0 : Math.round((a.negPct / polar) * 100) / 100,
        monthly: a.monthly,
        representativeReviewIds: reviews
          .filter((r) => r.aspectMentions.some((m) => m.aspectId === a.id))
          .slice(0, 3)
          .map((r) => r.id),
      };
    })
    .sort((x, y) => y.size - x.size);
}
```

- [ ] **Step 6: Create `web/src/lib/data/mock/query.ts`**

```ts
import type { Review, ReviewPage, ReviewQuery, ReviewSort } from "../schemas";

const byDate = (a: Review, b: Review) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id);
// Reviews without stars sort as 3★ so they sit in the middle.
const stars = (r: Review) => r.stars ?? 3;

const COMPARE: Record<ReviewSort, (a: Review, b: Review) => number> = {
  newest: (a, b) => byDate(b, a),
  oldest: byDate,
  lowest: (a, b) => stars(a) - stars(b) || byDate(b, a),
  highest: (a, b) => stars(b) - stars(a) || byDate(b, a),
};

/** Filter, sort and page reviews. The cursor is simply the offset of the next page. */
export function queryReviews(reviews: Review[], q: ReviewQuery): ReviewPage {
  const search = q.search?.toLowerCase();
  const matching = reviews
    .filter(
      (r) =>
        (!q.sentiment || r.sentiment === q.sentiment) &&
        (q.stars === undefined || r.stars === q.stars) &&
        (!q.aspectId || r.aspectMentions.some((m) => m.aspectId === q.aspectId)) &&
        (!search || r.text.toLowerCase().includes(search)),
    )
    .sort(COMPARE[q.sort]);
  const offset = q.cursor ? Number(q.cursor) : 0;
  const next = offset + q.limit;
  return {
    items: matching.slice(offset, next),
    nextCursor: next < matching.length ? String(next) : null,
    total: matching.length,
  };
}
```

- [ ] **Step 7: Update `web/src/lib/data/mock/build.ts`**

Make four changes:

1. **Imports and the `ShopEntry` type.** Add imports, extend the type, and add `byNewest`. These lines replace the existing `ShopEntry` line and sit with the other top-level code:

```ts
import type { Topic } from "../schemas";
import { generateReviews } from "./generate";
import { deriveTopics } from "./topics";

export type ShopEntry = { shop: Shop; overview: Overview; aspects: Aspect[]; reviews: Review[]; topics: Topic[] };

const byNewest = (a: Review, b: Review) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id);
```

2. **`buildShop` reviews.** Replace `const reviews = buildReviews(def);` with:

```ts
  const reviews = [...buildReviews(def), ...generateReviews(def, monthly.map((m) => m.month))].sort(byNewest);
```

3. **`buildShop` return.** Replace `return { shop, overview, aspects, reviews };` with:

```ts
  return { shop, overview, aspects, reviews, topics: deriveTopics(aspects, reviews) };
```

4. **Top complaints.** In `overview.topComplaints`, prefer hand-written quotes. A hand-written review id has no `-g` suffix. Replace the `quoteReviewId:` expression with:

```ts
        quoteReviewId:
          reviews.find((r) => !r.id.includes("-g") && r.aspectMentions.some((m) => m.aspectId === a.id && m.sentiment === "negative"))?.id ??
          reviews.find((r) => r.aspectMentions.some((m) => m.aspectId === a.id && m.sentiment === "negative"))?.id ??
          null,
```

- [ ] **Step 8: Add the methods to the interface and the mock**

In `web/src/lib/data/index.ts`, add `Topic`, `ReviewPage` and `ReviewQuery` to the schemas import, then add inside `interface DataSource`:

```ts
  getTopics(id: string): Promise<Topic[] | null>;
  getReviews(id: string, query: ReviewQuery): Promise<ReviewPage | null>;
```

In `web/src/lib/data/mock/index.ts`, add `import { queryReviews } from "./query";` and add these methods to `mockDataSource`:

```ts
  async getTopics(id) {
    return db.get(id)?.topics ?? null;
  },

  async getReviews(id, query) {
    const entry = db.get(id);
    return entry ? queryReviews(entry.reviews, query) : null;
  },
```

- [ ] **Step 9: Run the whole data suite and the type check.**

Run: `pnpm exec vitest run src/lib/data src/components/shop/OverviewView.test.tsx && pnpm typecheck`

Expected:
- PASS: query 6 tests, the new mock tests, and every existing data and overview test.
- typecheck exits 0.
- If an overview test fails because a quote changed, check that hand-written quotes are preferred (step 7.4).

- [ ] **Step 10: Commit, then run the mirror script.**

```bash
git add src/lib/data
git commit -m "feat(web): generated mock reviews, derived topics and paginated review queries" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Mock chat answers and live predictions

**Files:**
- Create: `web/src/lib/data/mock/ask.ts`, `web/src/lib/data/mock/predict.ts`
- Modify: `web/src/lib/data/index.ts`, `web/src/lib/data/mock/index.ts`, `web/src/lib/data/mock/mock.test.ts`
- Test: `web/src/lib/data/mock/ask.test.ts`, `web/src/lib/data/mock/predict.test.ts`

**Interfaces:**
- Consumes: `Aspect`, `Review`, `ChatChunk`, `Prediction`, `Tone`; `ASPECT_KEYWORDS` (Task 2); `buildDb` and `SHOP_DEFS`.
- Produces:
  - `composeAnswer(question: string, aspects: Aspect[], reviews: Review[]): ChatChunk[]`
  - `streamChunks(chunks: ChatChunk[], delayMs: number): AsyncIterable<ChatChunk>`
  - `predictText(text: string, aspects: Aspect[]): Prediction`
  - New `DataSource` methods: `ask(id: string, question: string): Promise<AsyncIterable<ChatChunk> | null>` and `predict(id: string, text: string): Promise<Prediction | null>`.

- [ ] **Step 1: Write the failing tests**

Create `web/src/lib/data/mock/ask.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { ChatChunkSchema, type ChatChunk } from "../schemas";
import { buildDb } from "./build";
import { composeAnswer, streamChunks } from "./ask";
import { SHOP_DEFS } from "./shops";

const saffron = buildDb(SHOP_DEFS).get("saffron-table")!;
const ask = (q: string) => composeAnswer(q, saffron.aspects, saffron.reviews);
const text = (chunks: ChatChunk[]) => chunks.map((c) => (c.type === "text" ? c.text : "")).join("");
const cites = (chunks: ChatChunk[]) => chunks.flatMap((c) => (c.type === "citation" ? [c.reviewId] : []));

describe("composeAnswer", () => {
  it("answers a complaint question with the most-complained-about aspect and negative citations", () => {
    const chunks = ask("Why do customers complain?");
    const worst = [...saffron.aspects].sort((a, b) => b.negPct - a.negPct)[0];
    expect(text(chunks).startsWith(`${worst.name}:`)).toBe(true);
    expect(cites(chunks).length).toBeGreaterThan(0);
    for (const id of cites(chunks)) {
      const review = saffron.reviews.find((r) => r.id === id)!;
      expect(review.aspectMentions.some((m) => m.sentiment === "negative")).toBe(true);
    }
    expect(chunks.at(-1)).toEqual({ type: "done" });
  });

  it("answers a praise question with the best-loved aspect", () => {
    const best = [...saffron.aspects].sort((a, b) => b.posPct - a.posPct)[0];
    expect(text(ask("What do people love here?")).startsWith(`${best.name}:`)).toBe(true);
  });

  it("answers about an aspect the question names", () => {
    expect(text(ask("How is the price?"))).toContain("Price:");
  });

  it("declines an off-topic question without citations", () => {
    const chunks = ask("What's the weather tomorrow?");
    expect(text(chunks)).toMatch(/^I couldn't find reviews that answer that\. Try asking about /);
    expect(cites(chunks)).toEqual([]);
  });

  it("only produces chunks that follow the contract", () => {
    ask("Why do customers complain?").forEach((c) => ChatChunkSchema.parse(c));
  });

  it("streams chunks in order", async () => {
    const out: ChatChunk[] = [];
    for await (const c of streamChunks([{ type: "text", text: "a" }, { type: "done" }], 0)) out.push(c);
    expect(out).toEqual([{ type: "text", text: "a" }, { type: "done" }]);
  });
});
```

Create `web/src/lib/data/mock/predict.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { PredictionSchema } from "../schemas";
import { buildDb } from "./build";
import { predictText } from "./predict";
import { SHOP_DEFS } from "./shops";

const aspects = buildDb(SHOP_DEFS).get("saffron-table")!.aspects;

describe("predictText", () => {
  it("scores each aspect by the sentence it appears in", () => {
    const p = predictText("The food was excellent but the wait was terrible.", aspects);
    PredictionSchema.parse(p);
    expect(p.aspects).toEqual([
      { id: "food", name: "Food", sentiment: "positive" },
      { id: "wait-time", name: "Wait time", sentiment: "negative" },
    ]);
    expect(p.sentiment).toBe("neutral");
  });

  it("calls a clearly happy review positive", () => {
    const p = predictText("Lovely ambience and friendly staff, great value.", aspects);
    expect(p.sentiment).toBe("positive");
    expect(p.score).toBeGreaterThan(0.2);
  });

  it("marks sentiment words on the tokens and keeps the text intact", () => {
    const text = "Terrible service!  Never again.";
    const p = predictText(text, aspects);
    expect(p.tokens.map((t) => t.text).join("")).toBe(text);
    expect(p.tokens.find((t) => t.text === "Terrible")?.tone).toBe("negative");
    expect(p.tokens.find((t) => t.text === "service")?.aspectId).toBe("service");
  });

  it("is neutral with low confidence when there are no signal words", () => {
    const p = predictText("We went on Tuesday.", aspects);
    expect(p).toMatchObject({ sentiment: "neutral", score: 0, confidence: 0.3, aspects: [] });
  });
});
```

Append this to `web/src/lib/data/mock/mock.test.ts`, adding `PredictionSchema` and `type ChatChunk` to its `../schemas` import:

```ts
  it("streams an answer and predicts for known shops only", async () => {
    const stream = await ds.ask("freshcart", "Why do customers complain?");
    const chunks: ChatChunk[] = [];
    for await (const c of stream!) chunks.push(c);
    expect(chunks.at(-1)).toEqual({ type: "done" });
    PredictionSchema.parse(await ds.predict("freshcart", "Bread was stale."));
    expect(await ds.ask("no-such-shop", "hi")).toBeNull();
    expect(await ds.predict("no-such-shop", "hi")).toBeNull();
  });
```

- [ ] **Step 2: Run the tests and confirm they fail.**

Run: `pnpm exec vitest run src/lib/data/mock`

Expected: FAIL. You'll see "Cannot find module './ask'" and "Cannot find module './predict'", and `ds.ask is not a function`.

- [ ] **Step 3: Create `web/src/lib/data/mock/ask.ts`**

```ts
import type { Aspect, ChatChunk, Review } from "../schemas";
import { ASPECT_KEYWORDS } from "./keywords";

// A rule-based stand-in for the RAG chat (Part 6). It follows the same contract:
// answer only from the shop's reviews, cite them, and decline when they can't help.

const PRAISE = /\b(love|like|best|praise|good|great|happy|enjoy)/;
const COMPLAINT = /\b(complain|complaint|problem|bad|worst|issue|wrong|hate|why|return|unhappy)/;

/** Splits text into word chunks so the client can render it as it streams. */
function words(text: string): ChatChunk[] {
  return text.split(/(?<= )/).map((w) => ({ type: "text", text: w }));
}

export function composeAnswer(question: string, aspects: Aspect[], reviews: Review[]): ChatChunk[] {
  const q = question.toLowerCase();
  const named = aspects.filter(
    (a) => q.includes(a.name.toLowerCase()) || (ASPECT_KEYWORDS[a.id] ?? []).some((k) => q.includes(k)),
  );
  const wantsPraise = PRAISE.test(q);
  const wantsComplaints = COMPLAINT.test(q);

  let chosen: Aspect[];
  let tone: "positive" | "negative" | null;
  if (named.length > 0) {
    chosen = named.slice(0, 2);
    tone = wantsComplaints ? "negative" : wantsPraise ? "positive" : null;
  } else if (wantsComplaints) {
    chosen = [...aspects].sort((x, y) => y.negPct - x.negPct).slice(0, 2);
    tone = "negative";
  } else if (wantsPraise) {
    chosen = [...aspects].sort((x, y) => y.posPct - x.posPct).slice(0, 2);
    tone = "positive";
  } else {
    const suggestions = [...aspects]
      .sort((x, y) => y.mentions - x.mentions)
      .slice(0, 3)
      .map((a) => a.name.toLowerCase())
      .join(", ");
    return [...words(`I couldn't find reviews that answer that. Try asking about ${suggestions}.`), { type: "done" }];
  }

  const chunks: ChatChunk[] = [];
  chosen.forEach((a, i) => {
    chunks.push(
      ...words(`${i === 0 ? "" : " "}${a.name}: ${Math.round(a.posPct)}% of mentions are positive and ${Math.round(a.negPct)}% negative.`),
    );
    reviews
      .filter((r) => r.aspectMentions.some((m) => m.aspectId === a.id && (tone === null || m.sentiment === tone)))
      .slice(0, 2)
      .forEach((r) => chunks.push({ type: "citation", reviewId: r.id }));
  });
  chunks.push({ type: "done" });
  return chunks;
}

/** Yields chunks with a small pause between them, imitating an LLM streaming tokens. */
export async function* streamChunks(chunks: ChatChunk[], delayMs: number): AsyncIterable<ChatChunk> {
  for (const chunk of chunks) {
    if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
    yield chunk;
  }
}
```

- [ ] **Step 4: Create `web/src/lib/data/mock/predict.ts`**

```ts
import type { Aspect, Prediction, Tone } from "../schemas";
import { ASPECT_KEYWORDS } from "./keywords";

// A word-list stand-in for the DistilBERT + ABSA models (Parts 2 and 4).

const POSITIVE = new Set([
  "great", "good", "excellent", "love", "loved", "lovely", "amazing", "perfect", "fresh", "friendly", "fast", "quick",
  "clean", "tasty", "delicious", "happy", "best", "solid", "worth", "recommend", "nice", "fantastic", "helpful",
  "smooth", "quiet", "efficient", "fair", "value",
]);
const NEGATIVE = new Set([
  "bad", "terrible", "awful", "worst", "slow", "late", "rude", "dirty", "cold", "stale", "wilted", "broken", "broke",
  "dead", "loud", "expensive", "overpriced", "disappointed", "disappointing", "never", "poor", "crushed", "leaked",
  "postponed", "missing", "sticky", "mushy", "noisy", "waited", "letdown", "ruined", "horrible",
]);

// Words, runs of whitespace, and punctuation, so joining the tokens rebuilds the exact text.
const TOKEN = /[\p{L}\p{N}']+|\s+|[^\p{L}\p{N}'\s]+/gu;

type Token = Prediction["tokens"][number];

export function predictText(text: string, aspects: Aspect[]): Prediction {
  const vocab = new Map<string, string>();
  for (const a of aspects) {
    for (const w of [...a.name.toLowerCase().split(/\s+/), ...(ASPECT_KEYWORDS[a.id] ?? [])]) {
      if (w.length > 2 && !vocab.has(w)) vocab.set(w, a.id);
    }
  }

  const tokens: Token[] = (text.match(TOKEN) ?? []).map((t) => ({ text: t }));
  const aspectScore = new Map<string, number>();
  let pos = 0;
  let neg = 0;
  let sentence = { aspects: new Set<string>(), score: 0 };
  const flush = () => {
    for (const id of sentence.aspects) aspectScore.set(id, (aspectScore.get(id) ?? 0) + sentence.score);
    sentence = { aspects: new Set<string>(), score: 0 };
  };

  for (const token of tokens) {
    const w = token.text.toLowerCase();
    if (POSITIVE.has(w)) {
      token.tone = "positive";
      pos++;
      sentence.score++;
    } else if (NEGATIVE.has(w)) {
      token.tone = "negative";
      neg++;
      sentence.score--;
    }
    const aspectId = vocab.get(w);
    if (aspectId) {
      token.aspectId = aspectId;
      sentence.aspects.add(aspectId);
    }
    // A sentence ends at . ! ? and "but" starts a new clause with its own sentiment.
    if (/[.!?]/.test(token.text) || w === "but") flush();
  }
  flush();

  const hits = pos + neg;
  const score = hits === 0 ? 0 : (pos - neg) / hits;
  const toneOf = (s: number): Tone => (s > 0 ? "positive" : s < 0 ? "negative" : "neutral");
  const names = new Map(aspects.map((a) => [a.id, a.name]));
  return {
    sentiment: hits === 0 || Math.abs(score) < 0.2 ? "neutral" : toneOf(score),
    score: Math.round(score * 100) / 100,
    confidence: hits === 0 ? 0.3 : Math.round(Math.min(0.95, 0.5 + 0.1 * hits) * 100) / 100,
    tokens,
    aspects: [...aspectScore].map(([id, s]) => ({ id, name: names.get(id) ?? id, sentiment: toneOf(s) })),
  };
}
```

- [ ] **Step 5: Wire `ask` and `predict` into the DataSource**

In `web/src/lib/data/index.ts`, add `ChatChunk` and `Prediction` to the schemas import, then add inside `interface DataSource`:

```ts
  ask(id: string, question: string): Promise<AsyncIterable<ChatChunk> | null>;
  predict(id: string, text: string): Promise<Prediction | null>;
```

In `web/src/lib/data/mock/index.ts`, add the imports and the constant:

```ts
import { composeAnswer, streamChunks } from "./ask";
import { predictText } from "./predict";

// Pause between streamed chunks, so the UI shows the answer arriving word by word.
const STREAM_DELAY_MS = 30;
```

Then add these methods to `mockDataSource`:

```ts
  async ask(id, question) {
    const entry = db.get(id);
    return entry ? streamChunks(composeAnswer(question, entry.aspects, entry.reviews), STREAM_DELAY_MS) : null;
  },

  async predict(id, text) {
    const entry = db.get(id);
    return entry ? predictText(text, entry.aspects) : null;
  },
```

- [ ] **Step 6: Run the tests and confirm they pass.**

Run: `pnpm exec vitest run src/lib/data && pnpm typecheck`

Expected: PASS (ask 6, predict 4, plus the new mock test and everything earlier), and typecheck exits 0.

- [ ] **Step 7: Commit, then run the mirror script.**

```bash
git add src/lib/data
git commit -m "feat(web): mock streamed chat answers with citations and a word-list predictor" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: API routes (the backend-for-frontend)

**Files:**
- Create:
  - `web/src/lib/api.ts`
  - `web/src/app/api/shops/[shopId]/reviews/route.ts`
  - `web/src/app/api/shops/[shopId]/ask/route.ts`
  - `web/src/app/api/shops/[shopId]/predict/route.ts`
- Modify: `docs/ENGINEERING.md` (repo root)
- Test:
  - `web/src/lib/api.test.ts`
  - `web/src/app/api/shops/[shopId]/reviews/route.test.ts`
  - `web/src/app/api/shops/[shopId]/ask/route.test.ts`
  - `web/src/app/api/shops/[shopId]/predict/route.test.ts`

**Interfaces:**
- Consumes:
  - `data` (Tasks 2 and 3).
  - `ReviewQuerySchema`, `AskRequestSchema`, `PredictRequestSchema`.
  - `getRequestId` (existing `@/lib/request`) and `createLogger` (existing `@/lib/logger`).
- Produces:
  - Error helpers:
    - `type ErrorCode = "VALIDATION_ERROR" | "NOT_FOUND" | "INTERNAL_ERROR"`
    - `apiError(code, status, message, requestId): Response`
    - `firstIssue(error: z.ZodError): string`
  - `GET /api/shops/:shopId/reviews?…` returns a `ReviewPage` as JSON.
  - `POST /api/shops/:shopId/ask` with body `{question}` returns an `application/x-ndjson` stream of `ChatChunk`.
  - `POST /api/shops/:shopId/predict` with body `{text}` returns a `Prediction` as JSON.

- [ ] **Step 1: Write the failing tests**

Create `web/src/lib/api.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { apiError, firstIssue } from "./api";

describe("API errors", () => {
  it("uses the shared error contract and echoes the request id", async () => {
    const res = apiError("NOT_FOUND", 404, "Shop not found", "req-1");
    expect(res.status).toBe(404);
    expect(res.headers.get("x-request-id")).toBe("req-1");
    expect(await res.json()).toEqual({ error: { code: "NOT_FOUND", message: "Shop not found", request_id: "req-1" } });
  });

  it("turns a zod error into one readable sentence", () => {
    const result = z.object({ limit: z.number().max(50) }).safeParse({ limit: 99 });
    expect(firstIssue(result.error!)).toMatch(/^limit: /);
  });
});
```

Create `web/src/app/api/shops/[shopId]/reviews/route.test.ts`:

```ts
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReviewPageSchema } from "@/lib/data/schemas";
import { GET } from "./route";

afterEach(() => vi.restoreAllMocks());
const ctx = (shopId: string) => ({ params: Promise.resolve({ shopId }) }) as RouteContext<"/api/shops/[shopId]/reviews">;
const get = (shopId: string, qs = "") => GET(new NextRequest(`http://test/api/shops/${shopId}/reviews${qs}`), ctx(shopId));

describe("GET /api/shops/:shopId/reviews", () => {
  it("returns a filtered page that follows the contract", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const res = await get("freshcart", "?sentiment=negative&limit=5");
    expect(res.status).toBe(200);
    const page = ReviewPageSchema.parse(await res.json());
    expect(page.items).toHaveLength(5);
    page.items.forEach((r) => expect(r.sentiment).toBe("negative"));
  });

  it("ignores empty parameters", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    expect((await get("freshcart", "?sentiment=&search=")).status).toBe(200);
  });

  it("rejects invalid parameters with a validation error", async () => {
    const res = await get("freshcart", "?limit=999");
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 404 for an unknown shop", async () => {
    const res = await get("nope");
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("NOT_FOUND");
  });
});
```

Create `web/src/app/api/shops/[shopId]/ask/route.test.ts`:

```ts
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { ChatChunkSchema } from "@/lib/data/schemas";
import { POST } from "./route";

const ctx = (shopId: string) => ({ params: Promise.resolve({ shopId }) }) as RouteContext<"/api/shops/[shopId]/ask">;
const post = (shopId: string, body: string) =>
  POST(new NextRequest(`http://test/api/shops/${shopId}/ask`, { method: "POST", body, headers: { "content-type": "application/json" } }), ctx(shopId));

describe("POST /api/shops/:shopId/ask", () => {
  it("streams NDJSON chat chunks ending with done", async () => {
    const res = await post("saffron-table", JSON.stringify({ question: "Why do customers complain?" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/x-ndjson");
    const lines = (await res.text()).trim().split("\n").map((l) => ChatChunkSchema.parse(JSON.parse(l)));
    expect(lines.at(-1)).toEqual({ type: "done" });
    expect(lines.some((c) => c.type === "citation")).toBe(true);
  });

  it("rejects a blank question", async () => {
    const res = await post("saffron-table", JSON.stringify({ question: "   " }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.message).toContain("Ask a question first");
  });

  it("rejects a malformed body", async () => {
    expect((await post("saffron-table", "{not json")).status).toBe(400);
  });

  it("returns 404 for an unknown shop", async () => {
    expect((await post("nope", JSON.stringify({ question: "hi" }))).status).toBe(404);
  });
});
```

Create `web/src/app/api/shops/[shopId]/predict/route.test.ts`:

```ts
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { PredictionSchema } from "@/lib/data/schemas";
import { POST } from "./route";

const ctx = (shopId: string) => ({ params: Promise.resolve({ shopId }) }) as RouteContext<"/api/shops/[shopId]/predict">;
const post = (shopId: string, body: unknown) =>
  POST(new NextRequest(`http://test/api/shops/${shopId}/predict`, { method: "POST", body: JSON.stringify(body) }), ctx(shopId));

describe("POST /api/shops/:shopId/predict", () => {
  it("returns a prediction", async () => {
    const res = await post("freshcart", { text: "Bread was stale and delivery was late." });
    expect(res.status).toBe(200);
    expect(PredictionSchema.parse(await res.json()).sentiment).toBe("negative");
  });

  it("rejects text over 2,000 characters", async () => {
    const res = await post("freshcart", { text: "a".repeat(2001) });
    expect(res.status).toBe(400);
    expect((await res.json()).error.message).toContain("2,000");
  });

  it("returns 404 for an unknown shop", async () => {
    expect((await post("nope", { text: "hi" })).status).toBe(404);
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail.**

Run: `pnpm exec vitest run src/lib/api.test.ts src/app/api/shops`

Expected: FAIL. You'll see "Cannot find module './api'" and "Cannot find module './route'".

- [ ] **Step 3: Create `web/src/lib/api.ts`**

```ts
import type { z } from "zod";

// The shared error shape for every API route (docs/ENGINEERING.md §3).
export type ErrorCode = "VALIDATION_ERROR" | "NOT_FOUND" | "INTERNAL_ERROR";

export function apiError(code: ErrorCode, status: number, message: string, requestId: string): Response {
  return Response.json(
    { error: { code, message, request_id: requestId } },
    { status, headers: { "x-request-id": requestId, "cache-control": "no-store" } },
  );
}

/** The first validation problem as one readable sentence, e.g. "limit: Too big: expected number to be <=50". */
export function firstIssue(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Invalid input";
  return `${issue.path.join(".") || "input"}: ${issue.message}`;
}
```

- [ ] **Step 4: Create `web/src/app/api/shops/[shopId]/reviews/route.ts`**

```ts
import type { NextRequest } from "next/server";
import { apiError, firstIssue } from "@/lib/api";
import { data } from "@/lib/data";
import { ReviewQuerySchema } from "@/lib/data/schemas";
import { createLogger } from "@/lib/logger";
import { getRequestId } from "@/lib/request";

export async function GET(request: NextRequest, ctx: RouteContext<"/api/shops/[shopId]/reviews">) {
  const requestId = getRequestId(request);
  const { shopId } = await ctx.params;
  // Empty values mean "no filter", so drop them before validating.
  const raw = Object.fromEntries([...request.nextUrl.searchParams].filter(([, v]) => v !== ""));
  const parsed = ReviewQuerySchema.safeParse(raw);
  if (!parsed.success) return apiError("VALIDATION_ERROR", 400, firstIssue(parsed.error), requestId);

  const page = await data.getReviews(shopId, parsed.data);
  if (!page) return apiError("NOT_FOUND", 404, "Shop not found", requestId);

  createLogger({ requestId }).info("reviews_listed", { shop_id: shopId, total: page.total });
  return Response.json(page, { headers: { "x-request-id": requestId, "cache-control": "no-store" } });
}
```

- [ ] **Step 5: Create `web/src/app/api/shops/[shopId]/ask/route.ts`**

```ts
import type { NextRequest } from "next/server";
import { apiError, firstIssue } from "@/lib/api";
import { data } from "@/lib/data";
import { AskRequestSchema } from "@/lib/data/schemas";
import { createLogger } from "@/lib/logger";
import { getRequestId } from "@/lib/request";

// Streams the answer as NDJSON: one JSON chat chunk per line, sent as soon as it exists.
export async function POST(request: NextRequest, ctx: RouteContext<"/api/shops/[shopId]/ask">) {
  const requestId = getRequestId(request);
  const { shopId } = await ctx.params;
  const parsed = AskRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("VALIDATION_ERROR", 400, firstIssue(parsed.error), requestId);

  const chunks = await data.ask(shopId, parsed.data.question);
  if (!chunks) return apiError("NOT_FOUND", 404, "Shop not found", requestId);

  const encoder = new TextEncoder();
  const line = (value: unknown) => encoder.encode(`${JSON.stringify(value)}\n`);
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of chunks) controller.enqueue(line(chunk));
      } catch (err) {
        createLogger({ requestId }).error("ask_stream_failed", { shop_id: shopId, error: String(err) });
        controller.enqueue(line({ type: "error", message: "The answer was interrupted. Please try again." }));
      } finally {
        controller.close();
      }
    },
  });
  return new Response(body, {
    headers: { "content-type": "application/x-ndjson; charset=utf-8", "x-request-id": requestId, "cache-control": "no-store" },
  });
}
```

- [ ] **Step 6: Create `web/src/app/api/shops/[shopId]/predict/route.ts`**

```ts
import type { NextRequest } from "next/server";
import { apiError, firstIssue } from "@/lib/api";
import { data } from "@/lib/data";
import { PredictRequestSchema } from "@/lib/data/schemas";
import { getRequestId } from "@/lib/request";

export async function POST(request: NextRequest, ctx: RouteContext<"/api/shops/[shopId]/predict">) {
  const requestId = getRequestId(request);
  const { shopId } = await ctx.params;
  const parsed = PredictRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("VALIDATION_ERROR", 400, firstIssue(parsed.error), requestId);

  const prediction = await data.predict(shopId, parsed.data.text);
  if (!prediction) return apiError("NOT_FOUND", 404, "Shop not found", requestId);
  return Response.json(prediction, { headers: { "x-request-id": requestId, "cache-control": "no-store" } });
}
```

- [ ] **Step 7: Document the new error code.** In `docs/ENGINEERING.md` (repo root), add this row to the §3 table directly under the `VALIDATION_ERROR` row:

```markdown
| `NOT_FOUND` | 404 | no | The shop (or other resource) doesn't exist or isn't visible to the caller |
```

- [ ] **Step 8: Run the tests and the type check.**

Run: `pnpm exec vitest run src/lib/api.test.ts src/app/api/shops && pnpm typecheck`

Expected: PASS (api 2, reviews 4, ask 4, predict 3), and typecheck exits 0. `RouteContext` is generated by `next typegen`.

- [ ] **Step 9: Commit, then run the mirror script.** Run from the repo root:

```bash
git add web/src/lib/api.ts web/src/lib/api.test.ts "web/src/app/api/shops" docs/ENGINEERING.md
git commit -m "feat(web): reviews, streamed ask and predict API routes with the error contract" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Highlighted review text and the review card

**Files:**
- Create: `web/src/lib/highlight.ts`, `web/src/components/shop/HighlightedText.tsx`, `web/src/components/shop/ReviewCard.tsx`
- Modify: `web/src/lib/format.ts`
- Test: `web/src/lib/highlight.test.ts`, `web/src/components/shop/ReviewCard.test.tsx`, `web/src/lib/format.test.ts` (append)

**Interfaces:**
- Consumes: `Review`, `Tone`.
- Produces:
  - `type Segment = { text: string; mention?: { aspectId: string; sentiment: Tone } }`
  - `segmentText(text: string, mentions: Review["aspectMentions"]): Segment[]`
  - `fmtDate(iso: string): string`, for example `"2026-10-04"` becomes `"4 Oct 2026"`.
  - `<HighlightedText text mentions aspectNames? />`
  - `<ReviewCard review aspectNames id? />`

- [ ] **Step 1: Write the failing tests**

Append this to `web/src/lib/format.test.ts`, and add `fmtDate` to its import:

```ts
describe("fmtDate", () => {
  it("formats ISO dates for people", () => expect(fmtDate("2026-10-04")).toBe("4 Oct 2026"));
});
```

Create `web/src/lib/highlight.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { segmentText } from "./highlight";

const m = (start: number, end: number, sentiment: "positive" | "negative" = "negative", aspectId = "a") => ({ aspectId, start, end, sentiment });

describe("segmentText", () => {
  it("returns plain text when there are no mentions", () => {
    expect(segmentText("hello", [])).toEqual([{ text: "hello" }]);
  });

  it("splits around mentions given in any order", () => {
    const parts = segmentText("food good, wait bad", [m(11, 15, "negative", "w"), m(0, 4, "positive", "f")]);
    expect(parts.map((p) => p.text)).toEqual(["food", " good, ", "wait", " bad"]);
    expect(parts[0].mention).toEqual({ aspectId: "f", sentiment: "positive" });
    expect(parts[2].mention).toEqual({ aspectId: "w", sentiment: "negative" });
  });

  it("keeps the first of two overlapping mentions and never loses text", () => {
    const parts = segmentText("abcdefgh", [m(2, 6), m(4, 8)]);
    expect(parts.map((p) => p.text).join("")).toBe("abcdefgh");
    expect(parts.filter((p) => p.mention)).toHaveLength(1);
  });

  it("ignores mentions outside the text", () => {
    expect(segmentText("abc", [m(2, 10)])).toEqual([{ text: "abc" }]);
  });
});
```

Create `web/src/components/shop/ReviewCard.test.tsx`:

```tsx
// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Review } from "@/lib/data/schemas";
import { ReviewCard } from "./ReviewCard";

const review: Review = {
  id: "r1", date: "2026-10-04", stars: 2, text: "Box arrived crushed <b>again</b>", sentiment: "negative", confidence: 0.9, helpful: 4,
  aspectMentions: [{ aspectId: "packaging", start: 0, end: 19, sentiment: "negative" }],
};

describe("ReviewCard", () => {
  it("shows stars, date, sentiment and highlighted aspect text", () => {
    const { container } = render(<ReviewCard review={review} aspectNames={{ packaging: "Packaging" }} />);
    expect(screen.getByLabelText("2 out of 5 stars")).toBeTruthy();
    expect(screen.getByText("4 Oct 2026")).toBeTruthy();
    expect(screen.getByText("negative")).toBeTruthy();
    const mark = container.querySelector("mark")!;
    expect(mark.textContent).toBe("Box arrived crushed");
    expect(mark.getAttribute("title")).toBe("Packaging");
    expect(screen.getByText("4 found this helpful")).toBeTruthy();
  });

  it("renders markup in review text as plain text", () => {
    const { container } = render(<ReviewCard review={review} aspectNames={{}} />);
    expect(container.querySelector("b")).toBeNull();
    expect(container.textContent).toContain("<b>again</b>");
  });

  it("says when a review has no star rating", () => {
    render(<ReviewCard review={{ ...review, stars: null }} aspectNames={{}} />);
    expect(screen.getByText("No rating")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail.**

Run: `pnpm exec vitest run src/lib/highlight.test.ts src/lib/format.test.ts src/components/shop/ReviewCard.test.tsx`

Expected: FAIL. `fmtDate` is not exported, and you'll see "Cannot find module './highlight'" and "./ReviewCard".

- [ ] **Step 3: Add `fmtDate` to `web/src/lib/format.ts`.** Put it after `fmtMonth`:

```ts
/** "2026-10-04" → "4 Oct 2026" */
export function fmtDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
```

- [ ] **Step 4: Create `web/src/lib/highlight.ts`**

```ts
import type { Review, Tone } from "@/lib/data/schemas";

export type Segment = { text: string; mention?: { aspectId: string; sentiment: Tone } };

/** Splits review text into plain and highlighted pieces. Joining the pieces always gives back the text. */
export function segmentText(text: string, mentions: Review["aspectMentions"]): Segment[] {
  const spans = mentions
    .filter((m) => m.start >= 0 && m.start < m.end && m.end <= text.length)
    .sort((a, b) => a.start - b.start);
  const out: Segment[] = [];
  let pos = 0;
  for (const m of spans) {
    if (m.start < pos) continue; // overlaps the previous mention: keep the first one
    if (m.start > pos) out.push({ text: text.slice(pos, m.start) });
    out.push({ text: text.slice(m.start, m.end), mention: { aspectId: m.aspectId, sentiment: m.sentiment } });
    pos = m.end;
  }
  if (pos < text.length || out.length === 0) out.push({ text: text.slice(pos) });
  return out;
}
```

- [ ] **Step 5: Create `web/src/components/shop/HighlightedText.tsx`**

```tsx
import { Fragment } from "react";
import type { Review } from "@/lib/data/schemas";
import { segmentText } from "@/lib/highlight";

const TONE = {
  positive: "border-pos text-pos",
  negative: "border-neg text-neg",
  neutral: "border-accent text-accent",
} as const;

type Props = { text: string; mentions: Review["aspectMentions"]; aspectNames?: Record<string, string> };

/** Review text with each aspect mention underlined in its sentiment colour. Always plain text, never HTML. */
export function HighlightedText({ text, mentions, aspectNames }: Props) {
  return (
    <>
      {segmentText(text, mentions).map((s, i) =>
        s.mention ? (
          <mark key={i} data-tone={s.mention.sentiment} title={aspectNames?.[s.mention.aspectId]} className={`border-b-2 bg-transparent ${TONE[s.mention.sentiment]}`}>
            {s.text}
          </mark>
        ) : (
          <Fragment key={i}>{s.text}</Fragment>
        ),
      )}
    </>
  );
}
```

- [ ] **Step 6: Create `web/src/components/shop/ReviewCard.tsx`**

```tsx
import type { Review } from "@/lib/data/schemas";
import { fmtDate } from "@/lib/format";
import { HighlightedText } from "./HighlightedText";

const PILL = {
  positive: "border-pos/60 text-pos",
  negative: "border-neg/60 text-neg",
  neutral: "border-accent/60 text-accent",
} as const;

function Stars({ value }: { value: number | null }) {
  if (value === null) return <span className="text-muted">No rating</span>;
  return (
    <span aria-label={`${value} out of 5 stars`} className="font-mono text-accent">
      {"★".repeat(value)}
      <span className="opacity-25">{"★".repeat(5 - value)}</span>
    </span>
  );
}

type Props = { review: Review; aspectNames: Record<string, string>; id?: string };

export function ReviewCard({ review, aspectNames, id }: Props) {
  return (
    <article id={id} className="grid gap-1 border-t border-line py-3 scroll-mt-24">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <Stars value={review.stars} />
        <span className="font-mono text-muted">{fmtDate(review.date)}</span>
        <span className={`ml-auto border px-1.5 font-mono ${PILL[review.sentiment]}`}>{review.sentiment}</span>
      </div>
      <p className="m-0 font-serif text-[15px] leading-relaxed">
        <HighlightedText text={review.text} mentions={review.aspectMentions} aspectNames={aspectNames} />
      </p>
      {review.helpful ? <p className="m-0 text-xs text-muted">{review.helpful} found this helpful</p> : null}
    </article>
  );
}
```

- [ ] **Step 7: Run the tests and confirm they pass.**

Run: `pnpm exec vitest run src/lib src/components/shop/ReviewCard.test.tsx src/test`

Expected: PASS (highlight 4, ReviewCard 3, fmtDate 1, plus the existing lib tests). The token guard stays green.

- [ ] **Step 8: Commit, then run the mirror script.**

```bash
git add src/lib/highlight.ts src/lib/highlight.test.ts src/lib/format.ts src/lib/format.test.ts src/components/shop/HighlightedText.tsx src/components/shop/ReviewCard.tsx src/components/shop/ReviewCard.test.tsx
git commit -m "feat(web): review card with aspect highlights" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Aspects page with the reviews drawer

**Files:**
- Create:
  - `web/src/components/shop/PageHeader.tsx`
  - `web/src/components/shop/PageSkeleton.tsx`
  - `web/src/components/shop/AspectDrawer.tsx`
  - `web/src/components/shop/AspectsView.tsx`
  - `web/src/app/(app)/shops/[shopId]/aspects/page.tsx`
- Modify:
  - `web/src/components/charts/AspectBars.tsx`
  - `web/src/components/shop/shop-nav.ts`
  - `web/src/test/setup.ts`
  - `web/src/app/globals.css`
- Test: `web/src/components/shop/AspectsView.test.tsx`, `web/src/components/charts/AspectBars.test.tsx` (append)

**Interfaces:**
- Consumes:
  - `AspectRow` (derive).
  - `ReviewCard` (Task 5).
  - `data.getAspects`, `data.getReviewsByIds` and `requireShop`.
  - `fmtInt` and `fmtPct`.
- Produces:
  - `<PageHeader eyebrow title>{children}</PageHeader>`
  - `<PageSkeleton label />`
  - `<AspectBars rows onSelect? />`: when `onSelect` is given, each row is a button that names the aspect.
  - `<AspectDrawer aspect reviews aspectNames onClose />`
  - `<AspectsView shop aspects reviews />`
  - The route `/shops/[shopId]/aspects`.
  - `SHOP_NAV` gains `{ slug: "aspects", label: "Aspects" }`.

- [ ] **Step 1: Write the failing tests**

Append this inside `describe("AspectBars", …)` in `web/src/components/charts/AspectBars.test.tsx`. Add `fireEvent` and `vi` to its imports.

```tsx
  it("turns rows into buttons when a row can be selected", () => {
    const onSelect = vi.fn();
    render(<AspectBars rows={[{ id: "price", name: "Price", mentions: 30, posPct: 72, negPct: 10 }]} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: /Price: 72% positive/ }));
    expect(onSelect).toHaveBeenCalledWith("price");
  });
```

Create `web/src/components/shop/AspectsView.test.tsx`:

```tsx
// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { buildDb } from "@/lib/data/mock/build";
import { SHOP_DEFS } from "@/lib/data/mock/shops";
import { AspectsView } from "./AspectsView";

const volt = buildDb(SHOP_DEFS).get("volthome")!;

describe("AspectsView", () => {
  it("opens a drawer with the reviews behind an aspect and closes it", () => {
    render(<AspectsView shop={volt.shop} aspects={volt.aspects} reviews={volt.reviews} />);
    fireEvent.click(screen.getByRole("button", { name: /^Installation:/ }));
    const dialog = screen.getByRole("dialog");
    expect(dialog.hasAttribute("open")).toBe(true);
    expect(screen.getByRole("heading", { level: 2, name: "Installation" })).toBeTruthy();
    // The highlight splits the sentence across elements, so check the dialog's whole text.
    expect(dialog.textContent).toContain("Fridge is fine but installation was postponed three times.");

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("heading", { level: 2, name: "Installation" })).toBeNull();
  });

  it("explains when a shop has no aspects yet", () => {
    render(<AspectsView shop={volt.shop} aspects={[]} reviews={[]} />);
    expect(screen.getByText(/No aspects found yet/)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail.**

Run: `pnpm exec vitest run src/components/charts/AspectBars.test.tsx src/components/shop/AspectsView.test.tsx`

Expected: FAIL. You'll see "Unable to find role button" in AspectBars, and "Cannot find module './AspectsView'".

- [ ] **Step 3: Add jsdom stubs to `web/src/test/setup.ts`.** jsdom doesn't implement every browser API. Append:

```ts
// jsdom lacks a few browser APIs the components use; give tests minimal versions.
if (typeof window !== "undefined") {
  const dialog = window.HTMLDialogElement?.prototype;
  if (dialog && !dialog.showModal) {
    dialog.showModal = function (this: HTMLDialogElement) {
      this.setAttribute("open", "");
    };
    dialog.close = function (this: HTMLDialogElement) {
      this.removeAttribute("open");
      this.dispatchEvent(new Event("close"));
    };
  }
  if (!window.matchMedia) {
    window.matchMedia = (query: string) =>
      ({
        matches: false, media: query, onchange: null,
        addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false,
      }) as MediaQueryList;
  }
  Element.prototype.scrollIntoView ??= function () {};
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
```

- [ ] **Step 4: Let `AspectBars` rows be selectable.** Replace the whole `web/src/components/charts/AspectBars.tsx` with:

```tsx
import type { AspectRow } from "@/lib/data/derive";
import { fmtSigned } from "@/lib/format";

const ROW = "grid w-full grid-cols-[7.5rem_1fr_3rem] items-center gap-3 text-left text-sm";

type Props = { rows: AspectRow[]; onSelect?: (id: string) => void };

/** Diverging bars: negative grows left from the centre line, positive grows right. */
export function AspectBars({ rows, onSelect }: Props) {
  if (rows.length === 0) return <p className="text-sm text-muted">No aspects mentioned in this range.</p>;
  return (
    <div>
      <ul className="m-0 grid list-none gap-2 p-0">
        {rows.map((r, i) => {
          const net = Math.round(r.posPct - r.negPct);
          const delay = { animationDelay: `${i * 50}ms` };
          const cells = (
            <>
              <span className="sr-only">
                {`${r.name}: ${Math.round(r.posPct)}% positive, ${Math.round(r.negPct)}% negative, net ${fmtSigned(net)}`}
              </span>
              <span aria-hidden className="truncate" title={r.name}>{r.name}</span>
              <span aria-hidden className="grid h-3.5 grid-cols-2">
                <span className="animate-grow h-full origin-right justify-self-end bg-neg" style={{ width: `${r.negPct}%`, ...delay }} />
                <span className="animate-grow h-full origin-left bg-pos" style={{ width: `${r.posPct}%`, ...delay }} />
              </span>
              <span aria-hidden className={`text-right font-mono text-xs ${net < 0 ? "text-neg" : "text-pos"}`}>
                {fmtSigned(net)}
              </span>
            </>
          );
          return (
            <li key={r.id}>
              {onSelect ? (
                <button
                  type="button"
                  aria-haspopup="dialog"
                  onClick={() => onSelect(r.id)}
                  className={`${ROW} -mx-1.5 px-1.5 py-1 hover:bg-panel focus-visible:outline-2 focus-visible:outline-accent`}
                >
                  {cells}
                </button>
              ) : (
                <div className={ROW}>{cells}</div>
              )}
            </li>
          );
        })}
      </ul>
      <p aria-hidden className="mt-2 ml-[8.25rem] mr-[3.75rem] flex justify-between border-t border-line pt-1 font-mono text-[10.5px] text-muted">
        <span>← negative</span>
        <span>positive →</span>
      </p>
    </div>
  );
}
```

- [ ] **Step 5: Add the drawer styles.** Append to `web/src/app/globals.css`, before the `@media (prefers-reduced-motion…)` block:

```css
/* Side drawer built on the native <dialog>: focus trap, Esc and an inert background come free. */
dialog.drawer {
  margin: 0 0 0 auto;
  height: 100dvh;
  max-height: 100dvh;
  width: min(34rem, 100vw);
  border: 0;
  border-left: 1px solid var(--color-line);
  background: var(--color-panel-2);
  color: var(--color-ink);
  padding: 0;
}
dialog.drawer[open] { animation: slide-in 0.3s cubic-bezier(0.2, 0.8, 0.2, 1); }
dialog.drawer::backdrop { background: rgb(0 0 0 / 0.55); }
@keyframes slide-in {
  from { transform: translateX(100%); }
  to { transform: none; }
}
```

- [ ] **Step 6: Create the shared page pieces**

`web/src/components/shop/PageHeader.tsx`:

```tsx
import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <header className="border-b border-line pb-4 pt-6">
      <p className="label">{eyebrow}</p>
      <h1 className="mt-1 break-words font-serif text-3xl">{title}</h1>
      {children ? <div className="mt-2 max-w-3xl text-sm text-muted">{children}</div> : null}
    </header>
  );
}
```

`web/src/components/shop/PageSkeleton.tsx`:

```tsx
/** Generic loading placeholder for shop pages: header, then a large content block. */
export function PageSkeleton({ label }: { label: string }) {
  return (
    <div aria-busy="true" aria-label={label} className="pt-6">
      <div className="skeleton h-3 w-48" />
      <div className="skeleton mt-3 h-8 w-72" />
      <div className="skeleton mt-8 h-72 w-full" />
    </div>
  );
}
```

- [ ] **Step 7: Create `web/src/components/shop/AspectDrawer.tsx`**

```tsx
"use client";

import { useEffect, useRef } from "react";
import type { Aspect, Review } from "@/lib/data/schemas";
import { fmtInt, fmtPct } from "@/lib/format";
import { ReviewCard } from "./ReviewCard";

type Props = {
  aspect: Aspect | null;
  reviews: Review[];
  aspectNames: Record<string, string>;
  onClose: () => void;
};

export function AspectDrawer({ aspect, reviews, aspectNames, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  // Open as a modal while an aspect is selected; showModal() traps focus and Esc closes it.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (aspect && !dialog.open) dialog.showModal();
    if (!aspect && dialog.open) dialog.close();
  }, [aspect]);

  const related = aspect ? reviews.filter((r) => r.aspectMentions.some((m) => m.aspectId === aspect.id)) : [];

  return (
    <dialog
      ref={ref}
      className="drawer"
      aria-labelledby="aspect-drawer-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose(); // a click on the backdrop
      }}
    >
      {aspect && (
        <div className="grid gap-3 p-6">
          <div className="flex items-start justify-between gap-4">
            <h2 id="aspect-drawer-title" className="m-0 break-words font-serif text-2xl">{aspect.name}</h2>
            <button type="button" onClick={onClose} className="border border-line px-2.5 py-1 text-sm hover:border-accent">
              Close
            </button>
          </div>
          <p className="m-0 font-mono text-sm">
            <span className="text-neg">{fmtPct(aspect.negPct)} negative</span>
            {" · "}
            <span className="text-pos">{fmtPct(aspect.posPct)} positive</span>
            {" · "}
            <span className="text-muted">{fmtInt(aspect.mentions)} mentions</span>
          </p>
          {aspect.isNew && (
            <p className="m-0 w-fit border border-info px-2 py-0.5 text-xs text-info">New: customers only started mentioning this recently</p>
          )}
          <h3 className="label mt-2">What customers said</h3>
          {related.length > 0 ? (
            <div>
              {related.map((r) => (
                <ReviewCard key={r.id} review={r} aspectNames={aspectNames} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">No example reviews for this aspect yet.</p>
          )}
        </div>
      )}
    </dialog>
  );
}
```

- [ ] **Step 8: Create `web/src/components/shop/AspectsView.tsx`**

```tsx
"use client";

import { useMemo, useState } from "react";
import { AspectBars } from "@/components/charts/AspectBars";
import type { Aspect, Review, Shop } from "@/lib/data/schemas";
import { AspectDrawer } from "./AspectDrawer";
import { PageHeader } from "./PageHeader";

type Props = { shop: Shop; aspects: Aspect[]; reviews: Review[] };

export function AspectsView({ shop, aspects, reviews }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const rows = useMemo(
    () =>
      [...aspects]
        .sort((a, b) => b.mentions - a.mentions)
        .map((a) => ({ id: a.id, name: a.name, mentions: a.mentions, posPct: a.posPct, negPct: a.negPct })),
    [aspects],
  );
  const aspectNames = useMemo(() => Object.fromEntries(aspects.map((a) => [a.id, a.name])), [aspects]);
  const selected = aspects.find((a) => a.id === selectedId) ?? null;

  return (
    <div className="animate-fade-rise">
      <PageHeader eyebrow={`${shop.name} · aspects`} title="What customers rate this shop on">
        These were discovered from the reviews. Select an aspect to read what customers actually wrote.
      </PageHeader>
      <section className="mt-6 max-w-3xl" aria-label="Aspect sentiment">
        {rows.length > 0 ? (
          <AspectBars rows={rows} onSelect={setSelectedId} />
        ) : (
          <p className="text-sm text-muted">No aspects found yet. Upload reviews to discover what customers talk about.</p>
        )}
      </section>
      <AspectDrawer aspect={selected} reviews={reviews} aspectNames={aspectNames} onClose={() => setSelectedId(null)} />
    </div>
  );
}
```

- [ ] **Step 9: Create the route `web/src/app/(app)/shops/[shopId]/aspects/page.tsx`**

```tsx
import { Suspense } from "react";
import { AspectsView } from "@/components/shop/AspectsView";
import { PageSkeleton } from "@/components/shop/PageSkeleton";
import { data } from "@/lib/data";
import { requireShop } from "@/lib/data/load";

export default function AspectsPage({ params }: PageProps<"/shops/[shopId]/aspects">) {
  return (
    <Suspense fallback={<PageSkeleton label="Loading aspects" />}>
      <AspectsLoader params={params} />
    </Suspense>
  );
}

async function AspectsLoader({ params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = await params;
  const shop = await requireShop(shopId);
  const aspects = (await data.getAspects(shopId)) ?? [];
  const reviews = await data.getReviewsByIds(shopId, aspects.flatMap((a) => a.exampleReviewIds));
  return <AspectsView shop={shop} aspects={aspects} reviews={reviews} />;
}
```

- [ ] **Step 10: Add the nav entry.** In `web/src/components/shop/shop-nav.ts`, set:

```ts
export const SHOP_NAV: ShopNavItem[] = [
  { slug: "overview", label: "Overview" },
  { slug: "aspects", label: "Aspects" },
];
```

- [ ] **Step 11: Run the tests and the type check.**

Run: `pnpm exec vitest run src/components src/test && pnpm typecheck`

Expected: PASS (AspectBars 4, AspectsView 2, all earlier component tests, the token guard), and typecheck exits 0.

- [ ] **Step 12: Commit, then run the mirror script.**

```bash
git add src/components src/test/setup.ts src/app/globals.css "src/app/(app)/shops/[shopId]/aspects"
git commit -m "feat(web): aspects page with a reviews drawer" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Topics page with the bubble map

**Files:**
- Create:
  - `web/src/components/charts/bubble-layout.ts`
  - `web/src/components/charts/Sparkline.tsx`
  - `web/src/components/charts/TopicBubbles.tsx`
  - `web/src/components/shop/TopicsView.tsx`
  - `web/src/app/(app)/shops/[shopId]/topics/page.tsx`
- Modify: `web/package.json` (install), `web/src/app/globals.css`, `web/src/components/shop/shop-nav.ts`
- Test: `web/src/components/charts/bubble-layout.test.ts`, `web/src/components/shop/TopicsView.test.tsx`

**Interfaces:**
- Consumes: `Topic`, `Review`; `ReviewCard`, `PageHeader`, `PageSkeleton` (Tasks 5 and 6); `data.getTopics`.
- Produces:
  - `type Bubble = { id: string; r: number; x: number; y: number }`
  - `layoutBubbles(items: { id: string; size: number }[], width: number, height: number): Bubble[]`
  - `<Sparkline values tone />`
  - `<TopicBubbles topics visibleIds selectedId onSelect />`
  - `<TopicsView shop topics reviews />`
  - The route `/shops/[shopId]/topics`, and the nav entry `topics`.

- [ ] **Step 1: Install d3-force**

```bash
pnpm add d3-force
pnpm add -D @types/d3-force
```

Expected: both are added to `package.json`.

- [ ] **Step 2: Write the failing tests**

Create `web/src/components/charts/bubble-layout.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { layoutBubbles } from "./bubble-layout";

const items = [
  { id: "a", size: 900 }, { id: "b", size: 400 }, { id: "c", size: 250 },
  { id: "d", size: 120 }, { id: "e", size: 60 }, { id: "f", size: 30 },
];

describe("layoutBubbles", () => {
  it("places one bubble per topic inside the box", () => {
    const bubbles = layoutBubbles(items, 560, 360);
    expect(bubbles).toHaveLength(6);
    for (const b of bubbles) {
      expect(b.x - b.r).toBeGreaterThanOrEqual(0);
      expect(b.x + b.r).toBeLessThanOrEqual(560);
      expect(b.y - b.r).toBeGreaterThanOrEqual(0);
      expect(b.y + b.r).toBeLessThanOrEqual(360);
    }
  });

  it("does not overlap bubbles", () => {
    const bubbles = layoutBubbles(items, 560, 360);
    for (let i = 0; i < bubbles.length; i++) {
      for (let j = i + 1; j < bubbles.length; j++) {
        const [p, q] = [bubbles[i], bubbles[j]];
        expect(Math.hypot(p.x - q.x, p.y - q.y)).toBeGreaterThanOrEqual(p.r + q.r - 1);
      }
    }
  });

  it("gives bigger topics bigger bubbles and is repeatable", () => {
    const bubbles = layoutBubbles(items, 560, 360);
    expect(bubbles[0].r).toBeGreaterThan(bubbles[5].r);
    expect(layoutBubbles(items, 560, 360)).toEqual(bubbles);
  });

  it("handles no topics", () => expect(layoutBubbles([], 560, 360)).toEqual([]));
});
```

Create `web/src/components/shop/TopicsView.test.tsx`:

```tsx
// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { buildDb } from "@/lib/data/mock/build";
import { SHOP_DEFS } from "@/lib/data/mock/shops";
import { TopicsView } from "./TopicsView";

// Saffron Table has a clear complaint topic (wait time), so the filter test has something to show.
const fresh = buildDb(SHOP_DEFS).get("saffron-table")!;
const renderView = () => render(<TopicsView shop={fresh.shop} topics={fresh.topics} reviews={fresh.reviews} />);

describe("TopicsView", () => {
  it("draws one selectable bubble per topic and shows the biggest topic first", () => {
    renderView();
    expect(screen.getAllByRole("button", { name: /reviews,/ })).toHaveLength(fresh.topics.length);
    expect(screen.getByRole("heading", { level: 2, name: fresh.topics[0].label })).toBeTruthy();
  });

  it("shows a topic's details when its bubble is chosen", () => {
    renderView();
    const target = fresh.topics[2];
    fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${target.label}`) }));
    expect(screen.getByRole("heading", { level: 2, name: target.label })).toBeTruthy();
    target.keywords.forEach((k) => expect(screen.getAllByText(k).length).toBeGreaterThan(0));
  });

  it("filters to complaint topics", () => {
    renderView();
    fireEvent.click(screen.getByRole("button", { name: "Mostly complaints" }));
    const complaints = fresh.topics.filter((t) => t.negShare >= 0.5);
    expect(complaints.length).toBeGreaterThan(0);
    expect(complaints.length).toBeLessThan(fresh.topics.length);
    expect(screen.queryAllByRole("button", { name: /reviews,/ })).toHaveLength(complaints.length);
  });
});
```

- [ ] **Step 3: Run the tests and confirm they fail.**

Run: `pnpm exec vitest run src/components/charts/bubble-layout.test.ts src/components/shop/TopicsView.test.tsx`

Expected: FAIL. You'll see "Cannot find module './bubble-layout'" and "./TopicsView".

- [ ] **Step 4: Create `web/src/components/charts/bubble-layout.ts`**

```ts
import { forceCollide, forceSimulation, forceX, forceY, type SimulationNodeDatum } from "d3-force";

export type Bubble = { id: string; r: number; x: number; y: number };
type Node = SimulationNodeDatum & { id: string; r: number };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Packs circles (area ∝ size) around the centre with a short physics simulation.
 * d3-force seeds its starting spiral deterministically, so the same input gives the same layout.
 */
export function layoutBubbles(items: { id: string; size: number }[], width: number, height: number): Bubble[] {
  if (items.length === 0) return [];
  const largest = Math.max(1, ...items.map((i) => i.size));
  const maxR = Math.min(width, height) / 5;
  const nodes: Node[] = items.map((i) => ({ id: i.id, r: Math.max(10, Math.sqrt(i.size / largest) * maxR) }));
  const simulation = forceSimulation(nodes)
    .force("x", forceX(width / 2).strength(0.06))
    .force("y", forceY(height / 2).strength(0.09))
    .force("collide", forceCollide<Node>((n) => n.r + 3).iterations(3))
    .stop();
  for (let i = 0; i < 300; i++) simulation.tick();
  return nodes.map((n) => ({
    id: n.id,
    r: n.r,
    x: clamp(n.x ?? width / 2, n.r, width - n.r),
    y: clamp(n.y ?? height / 2, n.r, height - n.r),
  }));
}
```

- [ ] **Step 5: Create `web/src/components/charts/Sparkline.tsx`**

```tsx
import { scaleLinear } from "d3-scale";
import { line } from "d3-shape";

const STROKE = { positive: "stroke-pos", negative: "stroke-neg", neutral: "stroke-accent" } as const;

/** A tiny trend line with no axes. Decorative, so hidden from screen readers. */
export function Sparkline({ values, tone }: { values: number[]; tone: keyof typeof STROKE }) {
  if (values.length < 2) return null;
  const x = scaleLinear().domain([0, values.length - 1]).range([0, 300]);
  const y = scaleLinear().domain([0, Math.max(1, ...values)]).range([58, 4]);
  const d = line<number>().x((_, i) => x(i)).y((v) => y(v))(values) ?? "";
  return (
    <svg aria-hidden viewBox="0 0 300 60" preserveAspectRatio="none" className="h-14 w-full">
      <path d={d} className={`fill-none ${STROKE[tone]}`} strokeWidth={2} />
    </svg>
  );
}
```

- [ ] **Step 6: Add the pop-in animation.** Append to `web/src/app/globals.css`, before the reduced-motion block:

```css
@keyframes pop {
  from { transform: scale(0); }
  to { transform: scale(1); }
}
.animate-pop { animation: pop 0.5s cubic-bezier(0.2, 1.3, 0.4, 1) both; transform-box: fill-box; transform-origin: center; }
```

- [ ] **Step 7: Create `web/src/components/charts/TopicBubbles.tsx`**

```tsx
"use client";

import { useMemo } from "react";
import type { Topic } from "@/lib/data/schemas";
import { fmtInt } from "@/lib/format";
import { layoutBubbles } from "./bubble-layout";

const W = 560;
const H = 360;

type Props = { topics: Topic[]; visibleIds: Set<string>; selectedId: string | null; onSelect: (id: string) => void };

/** Bubble size = number of reviews; colour runs from positive (green) to negative (red). */
export function TopicBubbles({ topics, visibleIds, selectedId, onSelect }: Props) {
  // Lay out every topic once, so bubbles keep their place while filters dim them.
  const bubbles = useMemo(() => layoutBubbles(topics.map((t) => ({ id: t.id, size: t.size })), W, H), [topics]);
  const byId = new Map(topics.map((t) => [t.id, t]));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="group" aria-label="Topic map">
      {bubbles.map((b, i) => {
        const t = byId.get(b.id)!;
        const visible = visibleIds.has(t.id);
        const selected = t.id === selectedId;
        const label = `${t.label}: ${fmtInt(t.size)} reviews, ${Math.round(t.negShare * 100)}% negative`;
        return (
          <g
            key={t.id}
            transform={`translate(${b.x} ${b.y})`}
            role={visible ? "button" : undefined}
            aria-label={visible ? label : undefined}
            aria-hidden={visible ? undefined : true}
            aria-pressed={visible ? selected : undefined}
            tabIndex={visible ? 0 : -1}
            onClick={() => visible && onSelect(t.id)}
            onKeyDown={(e) => {
              if (visible && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                onSelect(t.id);
              }
            }}
            className={`cursor-pointer outline-none transition-opacity ${visible ? "opacity-100" : "pointer-events-none opacity-20"}`}
          >
            <circle
              r={b.r}
              className={`animate-pop stroke-bg ${selected ? "stroke-ink" : ""}`}
              strokeWidth={selected ? 3 : 2}
              style={{ fill: `color-mix(in srgb, var(--color-neg) ${Math.round(t.negShare * 100)}%, var(--color-pos))`, animationDelay: `${i * 40}ms` }}
            />
            {b.r > 34 && (
              <text textAnchor="middle" dy="0.35em" fontSize={11} className="pointer-events-none fill-bg font-semibold">
                {t.label.split(":")[0]}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
```

- [ ] **Step 8: Create `web/src/components/shop/TopicsView.tsx`**

```tsx
"use client";

import { useMemo, useState } from "react";
import { Sparkline } from "@/components/charts/Sparkline";
import { TopicBubbles } from "@/components/charts/TopicBubbles";
import type { Review, Shop, Topic } from "@/lib/data/schemas";
import { fmtInt } from "@/lib/format";
import { PageHeader } from "./PageHeader";
import { ReviewCard } from "./ReviewCard";

const FILTERS = [
  { key: "all", label: "All topics", test: () => true },
  { key: "complaints", label: "Mostly complaints", test: (t: Topic) => t.negShare >= 0.5 },
  { key: "praise", label: "Mostly praise", test: (t: Topic) => t.negShare <= 0.25 },
] as const;

type Props = { shop: Shop; topics: Topic[]; reviews: Review[] };

export function TopicsView({ shop, topics, reviews }: Props) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");
  const [selectedId, setSelectedId] = useState<string | null>(topics[0]?.id ?? null);
  const test = FILTERS.find((f) => f.key === filter)!.test;
  const visibleIds = useMemo(() => new Set(topics.filter(test).map((t) => t.id)), [topics, test]);
  const selected = topics.find((t) => t.id === selectedId) ?? null;
  const reviewById = useMemo(() => new Map(reviews.map((r) => [r.id, r])), [reviews]);
  const aspectNames = useMemo(() => Object.fromEntries(topics.map((t) => [t.id.replace(/^t-/, ""), t.label.split(":")[0]])), [topics]);

  return (
    <div className="animate-fade-rise">
      <PageHeader eyebrow={`${shop.name} · topics`} title="What customers talk about">
        Each bubble is a theme found in the reviews. Bigger means more reviews; redder means more complaints.
      </PageHeader>

      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Filter topics">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            aria-pressed={filter === f.key}
            onClick={() => setFilter(f.key)}
            className="border border-line bg-panel px-3 py-1 text-sm hover:border-accent aria-pressed:border-accent aria-pressed:bg-accent aria-pressed:text-bg"
          >
            {f.label}
          </button>
        ))}
      </div>

      {topics.length === 0 ? (
        <p className="mt-8 text-sm text-muted">No topics found yet. Upload reviews to discover them.</p>
      ) : (
        <div className="mt-4 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <TopicBubbles topics={topics} visibleIds={visibleIds} selectedId={selectedId} onSelect={setSelectedId} />
            {visibleIds.size === 0 && <p className="text-sm text-muted">No topics match this filter.</p>}
          </div>
          {selected && (
            <section className="border border-line bg-panel p-5" aria-labelledby="topic-title">
              <p className="label">{fmtInt(selected.size)} reviews</p>
              <h2 id="topic-title" className="mt-1 break-words font-serif text-2xl">{selected.label}</h2>
              <p className="mt-1 font-mono text-sm">
                <span className="text-neg">{Math.round(selected.negShare * 100)}% negative</span>
                {" · "}
                <span className="text-pos">{100 - Math.round(selected.negShare * 100)}% positive</span>
              </p>
              <ul className="mt-3 flex list-none flex-wrap gap-1.5 p-0" aria-label="Keywords">
                {selected.keywords.map((k) => (
                  <li key={k} className="border border-line px-1.5 font-mono text-xs">{k}</li>
                ))}
              </ul>
              <p className="label mt-4">Mentions per month</p>
              <Sparkline values={selected.monthly.map((m) => m.count)} tone={selected.negShare >= 0.5 ? "negative" : "positive"} />
              <p className="label mt-4">Representative reviews</p>
              {selected.representativeReviewIds
                .map((id) => reviewById.get(id))
                .filter((r): r is Review => Boolean(r))
                .map((r) => (
                  <ReviewCard key={r.id} review={r} aspectNames={aspectNames} />
                ))}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 9: Create the route `web/src/app/(app)/shops/[shopId]/topics/page.tsx`**

```tsx
import { Suspense } from "react";
import { PageSkeleton } from "@/components/shop/PageSkeleton";
import { TopicsView } from "@/components/shop/TopicsView";
import { data } from "@/lib/data";
import { requireShop } from "@/lib/data/load";

export default function TopicsPage({ params }: PageProps<"/shops/[shopId]/topics">) {
  return (
    <Suspense fallback={<PageSkeleton label="Loading topics" />}>
      <TopicsLoader params={params} />
    </Suspense>
  );
}

async function TopicsLoader({ params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = await params;
  const shop = await requireShop(shopId);
  const topics = (await data.getTopics(shopId)) ?? [];
  const reviews = await data.getReviewsByIds(shopId, topics.flatMap((t) => t.representativeReviewIds));
  return <TopicsView shop={shop} topics={topics} reviews={reviews} />;
}
```

- [ ] **Step 10: Add the nav entry.** In `web/src/components/shop/shop-nav.ts`, set:

```ts
export const SHOP_NAV: ShopNavItem[] = [
  { slug: "overview", label: "Overview" },
  { slug: "topics", label: "Topics" },
  { slug: "aspects", label: "Aspects" },
];
```

- [ ] **Step 11: Run the tests and the type check.**

Run: `pnpm exec vitest run src/components src/test && pnpm typecheck`

Expected: PASS (bubble-layout 4, TopicsView 3, everything earlier), and typecheck exits 0.

- [ ] **Step 12: Commit, then run the mirror script.**

```bash
git add package.json pnpm-lock.yaml src/components src/app/globals.css "src/app/(app)/shops/[shopId]/topics"
git commit -m "feat(web): topics page with a bubble map and topic details" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Reviews explorer

**Files:**
- Create: `web/src/components/shop/ReviewExplorer.tsx`, `web/src/app/(app)/shops/[shopId]/reviews/page.tsx`
- Modify: `web/package.json` (install), `web/src/components/shop/shop-nav.ts`
- Test: `web/src/components/shop/ReviewExplorer.test.tsx`

**Interfaces:**
- Consumes:
  - `ReviewPage`, `ReviewQuery`, `Aspect`, `Tone`, `ReviewQuerySchema`.
  - `ReviewCard`, `PageHeader`, `PageSkeleton`.
  - `GET /api/shops/:shopId/reviews` (Task 4) and `data.getReviews`.
- Produces:
  - `<ReviewExplorer shopId aspects initial />`
  - The route `/shops/[shopId]/reviews`, and the nav entry `reviews`.

- [ ] **Step 1: Install motion**

```bash
pnpm add motion
```

- [ ] **Step 2: Write the failing test** (`web/src/components/shop/ReviewExplorer.test.tsx`)

```tsx
// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Review, ReviewPage } from "@/lib/data/schemas";
import { ReviewExplorer } from "./ReviewExplorer";

const review = (id: string, text: string, sentiment: Review["sentiment"] = "positive"): Review => ({
  id, date: "2026-10-01", stars: 4, text, sentiment, confidence: 0.9, aspectMentions: [],
});
const page = (items: Review[], total = items.length, nextCursor: string | null = null): ReviewPage => ({ items, total, nextCursor });
const aspects = [{ id: "food", name: "Food", mentions: 1, posPct: 1, negPct: 1, neuPct: 1, monthly: [], exampleReviewIds: [] }];

afterEach(() => vi.unstubAllGlobals());

function renderExplorer(initial = page([review("1", "First review")], 2, "1")) {
  render(<ReviewExplorer shopId="s1" aspects={aspects} initial={initial} />);
}

describe("ReviewExplorer", () => {
  it("shows the first page and the total", () => {
    renderExplorer();
    expect(screen.getByText("First review")).toBeTruthy();
    expect(screen.getByText("2 reviews")).toBeTruthy();
  });

  it("refetches with the chosen sentiment", async () => {
    const fetchMock = vi.fn(async () => Response.json(page([review("9", "Cold food", "negative")])));
    vi.stubGlobal("fetch", fetchMock);
    renderExplorer();
    fireEvent.click(screen.getByRole("button", { name: "Negative" }));
    await waitFor(() => expect(screen.getByText("Cold food")).toBeTruthy());
    expect(String((fetchMock.mock.calls[0] as unknown[])[0])).toContain("/api/shops/s1/reviews?sentiment=negative");
  });

  it("shows only the latest filters' results when responses arrive out of order", async () => {
    vi.stubGlobal("fetch", vi.fn((url: string, init?: RequestInit) => {
      const slow = url.includes("sentiment=negative");
      return new Promise<Response>((resolve, reject) => {
        const timer = setTimeout(() => resolve(Response.json(page([review(slow ? "n" : "p", slow ? "Slow negative" : "Fast positive")]))), slow ? 150 : 10);
        init?.signal?.addEventListener("abort", () => {
          clearTimeout(timer);
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
    }));
    renderExplorer();
    fireEvent.click(screen.getByRole("button", { name: "Negative" }));
    fireEvent.click(screen.getByRole("button", { name: "Positive" }));
    await waitFor(() => expect(screen.getByText("Fast positive")).toBeTruthy());
    await new Promise((r) => setTimeout(r, 200));
    expect(screen.queryByText("Slow negative")).toBeNull();
  });

  it("shows an empty state and clears filters", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json(page([])))
      .mockResolvedValueOnce(Response.json(page([review("1", "First review")])));
    vi.stubGlobal("fetch", fetchMock);
    renderExplorer();
    fireEvent.click(screen.getByRole("button", { name: "Neutral" }));
    await waitFor(() => expect(screen.getByText("No reviews match these filters.")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    await waitFor(() => expect(screen.getByText("First review")).toBeTruthy());
    expect(String(fetchMock.mock.calls[1][0])).not.toContain("sentiment=");
  });

  it("shows an error with a retry", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ error: { code: "INTERNAL_ERROR", message: "boom", request_id: "r" } }, { status: 500 }))
      .mockResolvedValueOnce(Response.json(page([review("5", "Back again")])));
    vi.stubGlobal("fetch", fetchMock);
    renderExplorer();
    fireEvent.click(screen.getByRole("button", { name: "Negative" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Couldn't load reviews"));
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(screen.getByText("Back again")).toBeTruthy());
  });

  it("loads more reviews onto the list", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(page([review("2", "Second review")], 2, null))));
    renderExplorer();
    fireEvent.click(screen.getByRole("button", { name: "Load more" }));
    await waitFor(() => expect(screen.getByText("Second review")).toBeTruthy());
    expect(screen.getByText("First review")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Load more" })).toBeNull();
  });

  it("searches after a short pause in typing", async () => {
    const fetchMock = vi.fn(async () => Response.json(page([review("7", "Stale bread")])));
    vi.stubGlobal("fetch", fetchMock);
    renderExplorer();
    fireEvent.change(screen.getByRole("searchbox", { name: "Search reviews" }), { target: { value: "bread" } });
    await waitFor(() => expect(screen.getByText("Stale bread")).toBeTruthy());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String((fetchMock.mock.calls[0] as unknown[])[0])).toContain("search=bread");
  });
});
```

- [ ] **Step 3: Run the test and confirm it fails.**

Run: `pnpm exec vitest run src/components/shop/ReviewExplorer.test.tsx`

Expected: FAIL with "Cannot find module './ReviewExplorer'".

- [ ] **Step 4: Create `web/src/components/shop/ReviewExplorer.tsx`**

```tsx
"use client";

import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Aspect, ReviewPage, ReviewSort, Tone } from "@/lib/data/schemas";
import { fmtInt } from "@/lib/format";
import { ReviewCard } from "./ReviewCard";

const SENTIMENTS: { value: Tone | undefined; label: string }[] = [
  { value: undefined, label: "All" },
  { value: "positive", label: "Positive" },
  { value: "neutral", label: "Neutral" },
  { value: "negative", label: "Negative" },
];
const SORTS: { value: ReviewSort; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "lowest", label: "Lowest stars" },
  { value: "highest", label: "Highest stars" },
];

type Filters = { sentiment?: Tone; aspectId: string; sort: ReviewSort; search: string };
const DEFAULT_FILTERS: Filters = { aspectId: "", sort: "newest", search: "" };

async function fetchReviews(shopId: string, f: Filters, cursor: string | null, signal: AbortSignal): Promise<ReviewPage> {
  const params = new URLSearchParams();
  if (f.sentiment) params.set("sentiment", f.sentiment);
  if (f.aspectId) params.set("aspectId", f.aspectId);
  if (f.search.trim()) params.set("search", f.search.trim());
  if (f.sort !== "newest") params.set("sort", f.sort);
  if (cursor) params.set("cursor", cursor);
  const res = await fetch(`/api/shops/${shopId}/reviews?${params}`, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

type Props = { shopId: string; aspects: Aspect[]; initial: ReviewPage };

export function ReviewExplorer({ shopId, aspects, initial }: Props) {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState<ReviewPage>(initial);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [attempt, setAttempt] = useState(0);
  const isFirstRun = useRef(true);
  const aspectNames = useMemo(() => Object.fromEntries(aspects.map((a) => [a.id, a.name])), [aspects]);

  // Wait for a pause in typing before searching.
  useEffect(() => {
    const timer = setTimeout(() => setFilters((f) => (f.search === searchText ? f : { ...f, search: searchText })), 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  // Refetch page one whenever filters change. Aborting the previous request means
  // a slow, outdated response can never overwrite a newer one.
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false; // the server already rendered page one for the default filters
      return;
    }
    const controller = new AbortController();
    setStatus("loading");
    fetchReviews(shopId, filters, null, controller.signal)
      .then((next) => {
        setPage(next);
        setStatus("idle");
      })
      .catch((err: unknown) => {
        if ((err as Error).name !== "AbortError") setStatus("error");
      });
    return () => controller.abort();
  }, [shopId, filters, attempt]);

  const loadMore = useCallback(async () => {
    if (!page.nextCursor) return;
    setStatus("loading");
    try {
      const next = await fetchReviews(shopId, filters, page.nextCursor, new AbortController().signal);
      setPage((prev) => ({ ...next, items: [...prev.items, ...next.items] }));
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }, [shopId, filters, page.nextCursor]);

  const clearFilters = () => {
    setSearchText("");
    setFilters({ ...DEFAULT_FILTERS });
  };

  const control = "border border-line bg-panel px-3 py-1 text-sm hover:border-accent";

  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Sentiment">
          {SENTIMENTS.map((s) => (
            <button
              key={s.label}
              type="button"
              aria-pressed={filters.sentiment === s.value}
              onClick={() => setFilters((f) => ({ ...f, sentiment: s.value }))}
              className={`${control} aria-pressed:border-accent aria-pressed:bg-accent aria-pressed:text-bg`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <select aria-label="Aspect" value={filters.aspectId} onChange={(e) => setFilters((f) => ({ ...f, aspectId: e.target.value }))} className={control}>
          <option value="">All aspects</option>
          {aspects.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
        <select aria-label="Sort" value={filters.sort} onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value as ReviewSort }))} className={control}>
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <input
          type="search"
          aria-label="Search reviews"
          placeholder="Search reviews…"
          maxLength={200}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className={`${control} min-w-48 flex-1 placeholder:text-muted focus:border-accent focus:outline-none`}
        />
      </div>

      <p className="mt-3 font-mono text-xs text-muted" aria-live="polite">
        {fmtInt(page.total)} {page.total === 1 ? "review" : "reviews"}
      </p>

      {status === "error" && (
        <div role="alert" className="mt-3 flex items-center gap-3 border border-neg/60 p-3 text-sm">
          <span>Couldn&apos;t load reviews.</span>
          <button type="button" onClick={() => setAttempt((n) => n + 1)} className="border border-neg px-2 py-0.5 text-neg hover:bg-neg hover:text-bg">
            Retry
          </button>
        </div>
      )}

      {page.items.length === 0 && status !== "loading" ? (
        <div className="mt-6 border border-dashed border-line p-6 text-center">
          <p className="m-0">No reviews match these filters.</p>
          <button type="button" onClick={clearFilters} className="mt-3 border border-accent px-3 py-1 text-sm text-accent hover:bg-accent hover:text-bg">
            Clear filters
          </button>
        </div>
      ) : (
        <MotionConfig reducedMotion="user">
          <ul aria-busy={status === "loading"} className={`m-0 list-none p-0 transition-opacity ${status === "loading" ? "opacity-50" : ""}`}>
            <AnimatePresence initial={false}>
              {page.items.map((r) => (
                <motion.li key={r.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                  <ReviewCard review={r} aspectNames={aspectNames} />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </MotionConfig>
      )}

      {page.nextCursor && (
        <button type="button" onClick={loadMore} disabled={status === "loading"} className={`${control} mt-4 disabled:opacity-50`}>
          Load more
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Create the route `web/src/app/(app)/shops/[shopId]/reviews/page.tsx`**

```tsx
import { Suspense } from "react";
import { PageHeader } from "@/components/shop/PageHeader";
import { PageSkeleton } from "@/components/shop/PageSkeleton";
import { ReviewExplorer } from "@/components/shop/ReviewExplorer";
import { data } from "@/lib/data";
import { requireShop } from "@/lib/data/load";
import { ReviewQuerySchema } from "@/lib/data/schemas";

export default function ReviewsPage({ params }: PageProps<"/shops/[shopId]/reviews">) {
  return (
    <Suspense fallback={<PageSkeleton label="Loading reviews" />}>
      <ReviewsLoader params={params} />
    </Suspense>
  );
}

async function ReviewsLoader({ params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = await params;
  const shop = await requireShop(shopId);
  const [aspects, initial] = await Promise.all([data.getAspects(shopId), data.getReviews(shopId, ReviewQuerySchema.parse({}))]);
  return (
    <div className="animate-fade-rise">
      <PageHeader eyebrow={`${shop.name} · reviews`} title="Every review, searchable">
        Filter by sentiment or aspect, sort, and search the text. Aspect mentions are underlined in their sentiment colour.
      </PageHeader>
      <ReviewExplorer shopId={shopId} aspects={aspects ?? []} initial={initial ?? { items: [], nextCursor: null, total: 0 }} />
    </div>
  );
}
```

- [ ] **Step 6: Add the nav entry.** In `web/src/components/shop/shop-nav.ts`, set:

```ts
export const SHOP_NAV: ShopNavItem[] = [
  { slug: "overview", label: "Overview" },
  { slug: "topics", label: "Topics" },
  { slug: "aspects", label: "Aspects" },
  { slug: "reviews", label: "Reviews" },
];
```

- [ ] **Step 7: Run the tests and the type check.**

Run: `pnpm exec vitest run src/components && pnpm typecheck`

Expected: PASS (ReviewExplorer 7, everything earlier), and typecheck exits 0.

- [ ] **Step 8: Commit, then run the mirror script.**

```bash
git add package.json pnpm-lock.yaml src/components "src/app/(app)/shops/[shopId]/reviews"
git commit -m "feat(web): reviews explorer with filters, search, sorting and load more" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Ask page (streamed answers with citations)

**Files:**
- Create: `web/src/lib/ndjson.ts`, `web/src/components/chat/ChatPanel.tsx`, `web/src/app/(app)/shops/[shopId]/ask/page.tsx`
- Modify: `web/src/lib/data/derive.ts`, `web/src/components/shop/shop-nav.ts`
- Test: `web/src/lib/ndjson.test.ts`, `web/src/components/chat/ChatPanel.test.tsx`, `web/src/lib/data/derive.test.ts` (append)

**Interfaces:**
- Consumes:
  - `ChatChunkSchema`, `Review` and `Aspect`.
  - `ReviewCard` and `PageHeader`.
  - `POST /api/shops/:shopId/ask` (Task 4) and `data.getAspects` / `data.getReviewsByIds`.
- Produces:
  - `readNdjson<T>(body: ReadableStream<Uint8Array>, parse: (value: unknown) => T): AsyncIterable<T>`
  - `suggestedQuestions(aspects: Aspect[]): string[]`
  - `<ChatPanel shopId suggestions reviews aspectNames />`
  - The route `/shops/[shopId]/ask`, and the nav entry `ask`.

- [ ] **Step 1: Write the failing tests**

Create `web/src/lib/ndjson.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { readNdjson } from "./ndjson";

function streamOf(...parts: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      parts.forEach((p) => controller.enqueue(encoder.encode(p)));
      controller.close();
    },
  });
}

async function collect<T>(it: AsyncIterable<T>) {
  const out: T[] = [];
  for await (const v of it) out.push(v);
  return out;
}

describe("readNdjson", () => {
  it("reassembles lines split across network chunks", async () => {
    expect(await collect(readNdjson(streamOf('{"a":', "1}\n", '{"a":2}\n'), (v) => v))).toEqual([{ a: 1 }, { a: 2 }]);
  });

  it("reads a final line without a trailing newline and skips blank lines", async () => {
    expect(await collect(readNdjson(streamOf('{"a":1}\n\n{"a":2}'), (v) => v))).toEqual([{ a: 1 }, { a: 2 }]);
  });

  it("throws on a line that isn't JSON", async () => {
    await expect(collect(readNdjson(streamOf("oops\n"), (v) => v))).rejects.toThrow();
  });
});
```

Append this to `web/src/lib/data/derive.test.ts`, and add `suggestedQuestions` to its `./derive` import:

```ts
describe("suggestedQuestions", () => {
  it("builds questions from the shop's own aspects", () => {
    const aspects = [
      { ...aspect("wait", "Wait time", []), posPct: 20, negPct: 60 },
      { ...aspect("food", "Food", []), posPct: 85, negPct: 5 },
    ];
    expect(suggestedQuestions(aspects)).toEqual([
      "Why do customers complain about wait time?",
      "What do customers love most?",
      "How do people feel about the food?",
    ]);
    expect(suggestedQuestions([])).toEqual([]);
  });
});
```

Create `web/src/components/chat/ChatPanel.test.tsx`:

```tsx
// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Review } from "@/lib/data/schemas";
import { ChatPanel } from "./ChatPanel";

const reviews: Review[] = [
  { id: "r1", date: "2026-10-01", stars: 1, text: "Waited an hour.", sentiment: "negative", confidence: 0.9, aspectMentions: [] },
];

function ndjson(lines: object[]): Response {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({
      start(controller) {
        lines.forEach((l) => controller.enqueue(encoder.encode(`${JSON.stringify(l)}\n`)));
        controller.close();
      },
    }),
    { headers: { "content-type": "application/x-ndjson" } },
  );
}

afterEach(() => vi.unstubAllGlobals());
const renderPanel = () =>
  render(<ChatPanel shopId="s1" suggestions={["Why do customers complain?"]} reviews={reviews} aspectNames={{}} />);

describe("ChatPanel", () => {
  it("streams an answer with numbered citations and shows the cited review", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      ndjson([{ type: "text", text: "Wait time: " }, { type: "text", text: "mostly negative." }, { type: "citation", reviewId: "r1" }, { type: "done" }]),
    ));
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "Why do customers complain?" }));
    await waitFor(() => expect(screen.getByText("Wait time: mostly negative.", { exact: false })).toBeTruthy());
    expect(screen.getByRole("button", { name: "Source 1" })).toBeTruthy();
    expect(screen.getByText("Waited an hour.")).toBeTruthy();
  });

  it("shows the server's message when the request is rejected", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      Response.json({ error: { code: "VALIDATION_ERROR", message: "question: Keep questions under 500 characters", request_id: "x" } }, { status: 400 }),
    ));
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "Why do customers complain?" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Keep questions under 500 characters"));
  });

  it("shows an error chunk from the stream with a way to try again", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ndjson([{ type: "text", text: "Partial " }, { type: "error", message: "The answer was interrupted." }])));
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "Why do customers complain?" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("The answer was interrupted."));
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
  });

  it("keeps the send button disabled for a blank question", () => {
    renderPanel();
    expect((screen.getByRole("button", { name: "Ask" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByRole("textbox", { name: "Ask a question about these reviews" }), { target: { value: "   " } });
    expect((screen.getByRole("button", { name: "Ask" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail.**

Run: `pnpm exec vitest run src/lib/ndjson.test.ts src/lib/data/derive.test.ts src/components/chat`

Expected: FAIL. You'll see "Cannot find module './ndjson'", that `suggestedQuestions` is not exported, and "Cannot find module './ChatPanel'".

- [ ] **Step 3: Create `web/src/lib/ndjson.ts`**

```ts
/**
 * Reads a newline-delimited JSON stream: one JSON value per line. A network chunk
 * can end mid-line, so text is buffered until a full line has arrived.
 */
export async function* readNdjson<T>(body: ReadableStream<Uint8Array>, parse: (value: unknown) => T): AsyncIterable<T> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let newline: number;
      while ((newline = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        if (line) yield parse(JSON.parse(line));
      }
    }
    buffer += decoder.decode();
    if (buffer.trim()) yield parse(JSON.parse(buffer.trim()));
  } finally {
    reader.releaseLock();
  }
}
```

- [ ] **Step 4: Add `suggestedQuestions` to `web/src/lib/data/derive.ts`** (append):

```ts
/** Starter questions for the Ask page, written from the shop's own aspects. */
export function suggestedQuestions(aspects: Aspect[]): string[] {
  if (aspects.length === 0) return [];
  const worst = [...aspects].sort((a, b) => b.negPct - a.negPct)[0];
  const best = [...aspects].sort((a, b) => b.posPct - a.posPct)[0];
  return [
    `Why do customers complain about ${worst.name.toLowerCase()}?`,
    "What do customers love most?",
    `How do people feel about the ${best.name.toLowerCase()}?`,
  ];
}
```

- [ ] **Step 5: Create `web/src/components/chat/ChatPanel.tsx`**

```tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ReviewCard } from "@/components/shop/ReviewCard";
import { ChatChunkSchema, type Review } from "@/lib/data/schemas";
import { readNdjson } from "@/lib/ndjson";

type Part = { kind: "text"; text: string } | { kind: "cite"; reviewId: string };
type Turn = { question: string; parts: Part[]; status: "streaming" | "done" | "error"; error?: string };

const WAKING_AFTER_MS = 1500;

type Props = { shopId: string; suggestions: string[]; reviews: Review[]; aspectNames: Record<string, string> };

export function ChatPanel({ shopId, suggestions, reviews, aspectNames }: Props) {
  const [turn, setTurn] = useState<Turn | null>(null);
  const [input, setInput] = useState("");
  const [waking, setWaking] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const reviewById = useMemo(() => new Map(reviews.map((r) => [r.id, r])), [reviews]);
  const streaming = turn?.status === "streaming";

  useEffect(() => () => controller.current?.abort(), []);

  async function ask(question: string) {
    controller.current?.abort();
    const ctrl = new AbortController();
    controller.current = ctrl;
    setTurn({ question, parts: [], status: "streaming" });
    setWaking(false);
    // An idle model host can take a while to start; say so instead of spinning silently.
    const wakingTimer = setTimeout(() => setWaking(true), WAKING_AFTER_MS);
    const update = (fn: (t: Turn) => Turn) => setTurn((t) => (t ? fn(t) : t));
    try {
      const res = await fetch(`/api/shops/${shopId}/ask`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? "Couldn't get an answer.");
      }
      for await (const chunk of readNdjson(res.body, (v) => ChatChunkSchema.parse(v))) {
        clearTimeout(wakingTimer);
        setWaking(false);
        if (chunk.type === "text") {
          update((t) => {
            const last = t.parts.at(-1);
            const parts: Part[] = last?.kind === "text" ? [...t.parts.slice(0, -1), { kind: "text", text: last.text + chunk.text }] : [...t.parts, { kind: "text", text: chunk.text }];
            return { ...t, parts };
          });
        } else if (chunk.type === "citation") {
          update((t) => ({ ...t, parts: [...t.parts, { kind: "cite", reviewId: chunk.reviewId }] }));
        } else if (chunk.type === "done") {
          update((t) => ({ ...t, status: "done" }));
        } else {
          update((t) => ({ ...t, status: "error", error: chunk.message }));
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      update((t) => ({ ...t, status: "error", error: (err as Error).message }));
    } finally {
      clearTimeout(wakingTimer);
      setWaking(false);
    }
  }

  // Number each cited review in order of first appearance.
  const citeNumbers = new Map<string, number>();
  turn?.parts.forEach((p) => {
    if (p.kind === "cite" && !citeNumbers.has(p.reviewId)) citeNumbers.set(p.reviewId, citeNumbers.size + 1);
  });
  const cited = [...citeNumbers.keys()].map((id) => reviewById.get(id)).filter((r): r is Review => Boolean(r));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = input.trim();
    if (!q || streaming) return;
    setInput("");
    void ask(q);
  };

  const showSource = (id: string) => {
    const el = document.getElementById(`source-${id}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    el?.focus();
  };

  return (
    <div className="mt-5 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
      <div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Suggested questions">
          {suggestions.map((s) => (
            <button key={s} type="button" disabled={streaming} onClick={() => void ask(s)} className="border border-line bg-panel px-3 py-1 text-left text-sm hover:border-accent disabled:opacity-50">
              {s}
            </button>
          ))}
        </div>

        <div className="mt-4 min-h-40 border border-line bg-panel p-4">
          {!turn ? (
            <p className="label">Answers appear here, with links to the reviews they come from</p>
          ) : (
            <div>
              <p className="m-0 mb-3 inline-block border border-line bg-panel-2 px-2.5 py-1 text-sm">{turn.question}</p>
              <div aria-live="polite" className="font-serif text-base leading-relaxed">
                {turn.parts.map((p, i) =>
                  p.kind === "text" ? (
                    <span key={i}>{p.text}</span>
                  ) : (
                    <button key={i} type="button" aria-label={`Source ${citeNumbers.get(p.reviewId)}`} onClick={() => showSource(p.reviewId)} className="mx-0.5 border border-accent px-1 font-mono text-[11px] text-accent hover:bg-accent hover:text-bg">
                      {citeNumbers.get(p.reviewId)}
                    </button>
                  ),
                )}
                {streaming && <span aria-hidden className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-ink align-[-2px]" />}
              </div>
              {waking && <p className="mt-2 text-sm text-muted">Waking the model (the first answer can take up to 30 s)…</p>}
              {turn.status === "error" && (
                <div role="alert" className="mt-3 flex flex-wrap items-center gap-3 border border-neg/60 p-3 text-sm">
                  <span>{turn.error ?? "Couldn't get an answer."}</span>
                  <button type="button" onClick={() => void ask(turn.question)} className="border border-neg px-2 py-0.5 text-neg hover:bg-neg hover:text-bg">
                    Try again
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <form onSubmit={submit} className="mt-3 flex gap-2">
          <input
            aria-label="Ask a question about these reviews"
            placeholder="Ask anything about these reviews…"
            maxLength={500}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="min-w-0 flex-1 border border-line bg-panel-2 px-3 py-2 text-sm placeholder:text-muted focus:border-accent focus:outline-none"
          />
          <button type="submit" disabled={!input.trim() || streaming} className="border border-accent bg-accent px-4 text-sm font-semibold text-bg disabled:opacity-40">
            Ask
          </button>
        </form>
      </div>

      <section aria-label="Sources">
        <p className="label mb-1">Sources</p>
        {cited.length === 0 ? (
          <p className="text-sm text-muted">Cited reviews will show here.</p>
        ) : (
          cited.map((r) => (
            <div key={r.id} tabIndex={-1} className="outline-none focus:bg-accent/10">
              <p className="m-0 mt-2 font-mono text-xs text-accent">[{citeNumbers.get(r.id)}]</p>
              <ReviewCard review={r} aspectNames={aspectNames} id={`source-${r.id}`} />
            </div>
          ))
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 6: Create the route `web/src/app/(app)/shops/[shopId]/ask/page.tsx`**

```tsx
import { Suspense } from "react";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { PageHeader } from "@/components/shop/PageHeader";
import { PageSkeleton } from "@/components/shop/PageSkeleton";
import { data } from "@/lib/data";
import { suggestedQuestions } from "@/lib/data/derive";
import { requireShop } from "@/lib/data/load";

export default function AskPage({ params }: PageProps<"/shops/[shopId]/ask">) {
  return (
    <Suspense fallback={<PageSkeleton label="Loading chat" />}>
      <AskLoader params={params} />
    </Suspense>
  );
}

async function AskLoader({ params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = await params;
  const shop = await requireShop(shopId);
  const aspects = (await data.getAspects(shopId)) ?? [];
  const reviews = await data.getReviewsByIds(shopId, aspects.flatMap((a) => a.exampleReviewIds));
  return (
    <div className="animate-fade-rise">
      <PageHeader eyebrow={`${shop.name} · ask`} title="Ask the reviews">
        Answers come only from this shop&apos;s reviews, and every claim links to the review it came from.
      </PageHeader>
      <ChatPanel
        shopId={shopId}
        suggestions={suggestedQuestions(aspects)}
        reviews={reviews}
        aspectNames={Object.fromEntries(aspects.map((a) => [a.id, a.name]))}
      />
    </div>
  );
}
```

- [ ] **Step 7: Add the nav entry.** In `web/src/components/shop/shop-nav.ts`, set:

```ts
export const SHOP_NAV: ShopNavItem[] = [
  { slug: "overview", label: "Overview" },
  { slug: "topics", label: "Topics" },
  { slug: "aspects", label: "Aspects" },
  { slug: "reviews", label: "Reviews" },
  { slug: "ask", label: "Ask" },
];
```

- [ ] **Step 8: Run the tests and the type check.**

Run: `pnpm exec vitest run src/lib src/components && pnpm typecheck`

Expected: PASS (ndjson 3, suggestedQuestions 1, ChatPanel 4, everything earlier), and typecheck exits 0.

- [ ] **Step 9: Commit, then run the mirror script.**

```bash
git add src/lib src/components "src/app/(app)/shops/[shopId]/ask"
git commit -m "feat(web): ask page with streamed answers and clickable citations" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Try it (live analysis as you type)

**Files:**
- Create: `web/src/components/charts/SentimentGauge.tsx`, `web/src/components/try/LiveAnalyzer.tsx`, `web/src/app/(app)/shops/[shopId]/try/page.tsx`
- Modify: `web/src/lib/data/derive.ts`, `web/src/components/shop/shop-nav.ts`
- Test: `web/src/components/try/LiveAnalyzer.test.tsx`, `web/src/lib/data/derive.test.ts` (append)

**Interfaces:**
- Consumes:
  - `Prediction` and `PredictionSchema`.
  - `POST /api/shops/:shopId/predict` (Task 4).
  - `PageHeader` and `PageSkeleton`.
- Produces:
  - `tryExamples(aspects: Aspect[]): string[]`
  - `<SentimentGauge score sentiment />`
  - `<LiveAnalyzer shopId examples />`
  - The route `/shops/[shopId]/try`, and the nav entry `try`.

- [ ] **Step 1: Write the failing tests**

Append this to `web/src/lib/data/derive.test.ts`, and add `tryExamples` to the `./derive` import:

```ts
describe("tryExamples", () => {
  it("writes example reviews from the shop's best and worst aspects", () => {
    const aspects = [
      { ...aspect("wait", "Wait time", []), posPct: 20, negPct: 60 },
      { ...aspect("food", "Food", []), posPct: 85, negPct: 5 },
    ];
    const [mixed, negative, positive] = tryExamples(aspects);
    expect(mixed).toBe("The food was excellent but the wait time was terrible.");
    expect(negative).toContain("wait time");
    expect(positive).toContain("food");
  });

  it("falls back to a generic example with too few aspects", () => {
    expect(tryExamples([])).toHaveLength(1);
  });
});
```

Create `web/src/components/try/LiveAnalyzer.test.tsx`:

```tsx
// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Prediction } from "@/lib/data/schemas";
import { LiveAnalyzer } from "./LiveAnalyzer";

const prediction: Prediction = {
  sentiment: "negative", score: -0.6, confidence: 0.8,
  tokens: [{ text: "Food" , aspectId: "food" }, { text: " " }, { text: "terrible", tone: "negative" }],
  aspects: [{ id: "food", name: "Food", sentiment: "negative" }],
};

afterEach(() => vi.unstubAllGlobals());

describe("LiveAnalyzer", () => {
  it("analyses text after a pause in typing", async () => {
    const fetchMock = vi.fn(async () => Response.json(prediction));
    vi.stubGlobal("fetch", fetchMock);
    render(<LiveAnalyzer shopId="s1" examples={[]} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Review text" }), { target: { value: "Food terrible" } });
    await waitFor(() => expect(screen.getByText(/negative · confidence 0\.80/)).toBeTruthy());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)).toEqual({ text: "Food terrible" });
    expect(screen.getByText("terrible").className).toContain("text-neg");
    expect(screen.getByRole("meter").getAttribute("aria-valuenow")).toBe("-0.6");
    expect(screen.getByText("− Food")).toBeTruthy();
  });

  it("fills the box from an example", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(prediction)));
    render(<LiveAnalyzer shopId="s1" examples={["The food was terrible."]} />);
    fireEvent.click(screen.getByRole("button", { name: "The food was terrible." }));
    expect((screen.getByRole("textbox", { name: "Review text" }) as HTMLTextAreaElement).value).toBe("The food was terrible.");
  });

  it("does not call the server for blank text", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<LiveAnalyzer shopId="s1" examples={[]} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Review text" }), { target: { value: "   " } });
    await new Promise((r) => setTimeout(r, 500));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows an error with a retry", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ error: { code: "INTERNAL_ERROR", message: "boom", request_id: "r" } }, { status: 500 }))
      .mockResolvedValueOnce(Response.json(prediction));
    vi.stubGlobal("fetch", fetchMock);
    render(<LiveAnalyzer shopId="s1" examples={[]} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Review text" }), { target: { value: "Food terrible" } });
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Couldn't analyse"));
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(screen.getByRole("meter")).toBeTruthy());
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail.**

Run: `pnpm exec vitest run src/lib/data/derive.test.ts src/components/try`

Expected: FAIL. `tryExamples` is not exported, and you'll see "Cannot find module './LiveAnalyzer'".

- [ ] **Step 3: Add `tryExamples` to `web/src/lib/data/derive.ts`** (append):

```ts
/** Example reviews for the "Try it" page, built from the shop's best and worst aspects. */
export function tryExamples(aspects: Aspect[]): string[] {
  if (aspects.length < 2) return ["Great service and fair prices, would recommend."];
  const best = [...aspects].sort((a, b) => b.posPct - a.posPct)[0].name.toLowerCase();
  const worst = [...aspects].sort((a, b) => b.negPct - a.negPct)[0].name.toLowerCase();
  return [
    `The ${best} was excellent but the ${worst} was terrible.`,
    `Really disappointed, the ${worst} was slow and the staff were rude.`,
    `Loved the ${best}, friendly people and great value. Would recommend!`,
  ];
}
```

- [ ] **Step 4: Create `web/src/components/charts/SentimentGauge.tsx`**

```tsx
import type { Tone } from "@/lib/data/schemas";

const VERDICT: Record<Tone, string> = { positive: "positive", negative: "negative", neutral: "mixed or neutral" };

/** A −1…+1 scale with a needle. Exposed to screen readers as a meter. */
export function SentimentGauge({ score, sentiment }: { score: number; sentiment: Tone }) {
  return (
    <div>
      <div className="label flex justify-between" aria-hidden>
        <span>Negative</span>
        <span>Neutral</span>
        <span>Positive</span>
      </div>
      <div
        role="meter"
        aria-label="Sentiment score"
        aria-valuemin={-1}
        aria-valuemax={1}
        aria-valuenow={score}
        aria-valuetext={VERDICT[sentiment]}
        className="relative my-1.5 h-2.5"
        style={{ background: "linear-gradient(90deg, var(--color-neg), var(--color-accent) 50%, var(--color-pos))" }}
      >
        <span
          aria-hidden
          className="absolute -top-1.5 h-5.5 w-[3px] bg-ink transition-[left] duration-500 ease-out"
          style={{ left: `calc(${50 + score * 48}% - 1.5px)` }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create `web/src/components/try/LiveAnalyzer.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { SentimentGauge } from "@/components/charts/SentimentGauge";
import { PredictionSchema, type Prediction } from "@/lib/data/schemas";

const DEBOUNCE_MS = 400;
const WAKING_AFTER_MS = 1500;
const MAX = 2000;

const TOKEN_TONE = { positive: "text-pos", negative: "text-neg", neutral: "" } as const;
const TAG = {
  positive: { sign: "+", cls: "border-pos text-pos" },
  negative: { sign: "−", cls: "border-neg text-neg" },
  neutral: { sign: "·", cls: "border-accent text-accent" },
} as const;

type Props = { shopId: string; examples: string[] };

export function LiveAnalyzer({ shopId, examples }: Props) {
  const [text, setText] = useState("");
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [waking, setWaking] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // Analyse after a pause in typing; a newer keystroke cancels the older request.
  useEffect(() => {
    const value = text.trim();
    if (!value) return;
    const controller = new AbortController();
    let wakingTimer: ReturnType<typeof setTimeout> | undefined;
    const debounce = setTimeout(async () => {
      setStatus("loading");
      wakingTimer = setTimeout(() => setWaking(true), WAKING_AFTER_MS);
      try {
        const res = await fetch(`/api/shops/${shopId}/predict`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text: value }),
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setPrediction(PredictionSchema.parse(await res.json()));
        setStatus("idle");
      } catch (err) {
        if ((err as Error).name !== "AbortError") setStatus("error");
      } finally {
        clearTimeout(wakingTimer);
        setWaking(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(debounce);
      clearTimeout(wakingTimer);
      controller.abort();
    };
  }, [text, shopId, attempt]);

  const hasText = text.trim().length > 0;

  return (
    <div className="mt-5 max-w-3xl">
      {examples.length > 0 && (
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Examples">
          <span className="label">Examples</span>
          {examples.map((ex) => (
            <button key={ex} type="button" onClick={() => setText(ex)} className="border border-line bg-panel px-3 py-1 text-left text-sm hover:border-accent">
              {ex}
            </button>
          ))}
        </div>
      )}

      <textarea
        aria-label="Review text"
        placeholder="Type or paste a customer review…"
        maxLength={MAX}
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="mt-3 h-28 w-full resize-y border border-line bg-panel-2 p-3 text-sm placeholder:text-muted focus:border-accent focus:outline-none"
      />
      <p className="m-0 text-right font-mono text-[11px] text-muted">{text.length.toLocaleString("en-US")} / 2,000</p>

      <div aria-live="polite" className="mt-2 min-h-32">
        {status === "loading" && <p className="m-0 text-sm text-muted">{waking ? "Waking the model (the first run can take up to 30 s)…" : "Analysing…"}</p>}
        {status === "error" && (
          <div role="alert" className="flex items-center gap-3 border border-neg/60 p-3 text-sm">
            <span>Couldn&apos;t analyse this text.</span>
            <button type="button" onClick={() => setAttempt((n) => n + 1)} className="border border-neg px-2 py-0.5 text-neg hover:bg-neg hover:text-bg">
              Retry
            </button>
          </div>
        )}
        {hasText && prediction && status !== "error" && (
          <div className="grid gap-3">
            <p className="m-0 font-serif text-lg leading-relaxed">
              {prediction.tokens.map((t, i) => (
                <span key={i} className={`${t.tone ? TOKEN_TONE[t.tone] : ""} ${t.aspectId ? "border-b-2 border-info" : ""}`}>
                  {t.text}
                </span>
              ))}
            </p>
            <SentimentGauge score={prediction.score} sentiment={prediction.sentiment} />
            <p className="m-0 font-mono text-sm">
              {prediction.sentiment} · confidence {prediction.confidence.toFixed(2)}
            </p>
            {prediction.aspects.length > 0 && (
              <ul className="m-0 flex list-none flex-wrap gap-2 p-0" aria-label="Aspects found">
                {prediction.aspects.map((a) => (
                  <li key={a.id} className={`animate-fade-rise border px-2 py-0.5 text-xs ${TAG[a.sentiment].cls}`}>
                    {`${TAG[a.sentiment].sign} ${a.name}`}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Create the route `web/src/app/(app)/shops/[shopId]/try/page.tsx`**

```tsx
import { Suspense } from "react";
import { PageHeader } from "@/components/shop/PageHeader";
import { PageSkeleton } from "@/components/shop/PageSkeleton";
import { LiveAnalyzer } from "@/components/try/LiveAnalyzer";
import { data } from "@/lib/data";
import { tryExamples } from "@/lib/data/derive";
import { requireShop } from "@/lib/data/load";

export default function TryPage({ params }: PageProps<"/shops/[shopId]/try">) {
  return (
    <Suspense fallback={<PageSkeleton label="Loading" />}>
      <TryLoader params={params} />
    </Suspense>
  );
}

async function TryLoader({ params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = await params;
  const shop = await requireShop(shopId);
  const aspects = (await data.getAspects(shopId)) ?? [];
  return (
    <div className="animate-fade-rise">
      <PageHeader eyebrow={`${shop.name} · try it`} title="See how a review is read">
        Type a review and watch the sentiment and aspects update as you write.
      </PageHeader>
      <LiveAnalyzer shopId={shopId} examples={tryExamples(aspects)} />
    </div>
  );
}
```

- [ ] **Step 7: Add the nav entry.** In `web/src/components/shop/shop-nav.ts`, set:

```ts
export const SHOP_NAV: ShopNavItem[] = [
  { slug: "overview", label: "Overview" },
  { slug: "topics", label: "Topics" },
  { slug: "aspects", label: "Aspects" },
  { slug: "reviews", label: "Reviews" },
  { slug: "ask", label: "Ask" },
  { slug: "try", label: "Try it" },
];
```

- [ ] **Step 8: Run the tests and the type check.**

Run: `pnpm exec vitest run src/lib src/components && pnpm typecheck`

Expected: PASS (tryExamples 2, LiveAnalyzer 4, everything earlier), and typecheck exits 0.

- [ ] **Step 9: Commit, then run the mirror script.**

```bash
git add src/lib src/components "src/app/(app)/shops/[shopId]/try"
git commit -m "feat(web): try-it page with live, debounced sentiment and aspect analysis" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Ctrl+K command palette

**Files:**
- Create: `web/src/components/shop/CommandPalette.tsx`
- Modify: `web/package.json` (install), `web/src/components/shop/Sidebar.tsx`, `web/src/components/shop/Sidebar.test.tsx`
- Test: `web/src/components/shop/CommandPalette.test.tsx`

**Interfaces:**
- Consumes: `Shop`, `visibleNav`, `shopTypeLabel`, and `useRouter` from `next/navigation`.
- Produces:
  - `<CommandPalette shops current />`, which opens on Ctrl+K / ⌘K or its button.
  - The palette is mounted in `Sidebar`.

- [ ] **Step 1: Install cmdk**

```bash
pnpm add cmdk
```

- [ ] **Step 2: Write the failing test** (`web/src/components/shop/CommandPalette.test.tsx`)

```tsx
// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Shop } from "@/lib/data/schemas";
import { CommandPalette } from "./CommandPalette";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const shop = (id: string, name: string, type: Shop["type"]): Shop => ({
  id, name, type, isDemo: true, reviewCount: 1, dateRange: { from: "2026-01", to: "2026-10" }, unreadAlerts: 0,
});
const shops = [shop("fresh", "FreshCart Grocery", "grocery"), shop("volt", "VoltHome Appliances", "electronics")];

describe("CommandPalette", () => {
  it("opens with Ctrl+K and jumps to a page of the current shop", () => {
    render(<CommandPalette shops={shops} current={shops[0]} />);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    expect(screen.getByPlaceholderText("Jump to a page or shop…")).toBeTruthy();
    fireEvent.click(screen.getByText("Reviews"));
    expect(push).toHaveBeenCalledWith("/shops/fresh/reviews");
  });

  it("switches shop from the palette", () => {
    render(<CommandPalette shops={shops} current={shops[0]} />);
    fireEvent.click(screen.getByRole("button", { name: /Search/ }));
    fireEvent.click(screen.getByText("VoltHome Appliances"));
    expect(push).toHaveBeenCalledWith("/shops/volt/overview");
  });
});
```

Update the `next/navigation` mock in `web/src/components/shop/Sidebar.test.tsx` so the palette inside the sidebar can render:

```tsx
vi.mock("next/navigation", () => ({ usePathname: () => "/shops/fresh/overview", useRouter: () => ({ push: vi.fn() }) }));
```

- [ ] **Step 3: Run the test and confirm it fails.**

Run: `pnpm exec vitest run src/components/shop/CommandPalette.test.tsx`

Expected: FAIL with "Cannot find module './CommandPalette'".

- [ ] **Step 4: Create `web/src/components/shop/CommandPalette.tsx`**

```tsx
"use client";

import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Shop } from "@/lib/data/schemas";
import { shopTypeLabel } from "@/lib/format";
import { visibleNav } from "./shop-nav";

type Props = { shops: Shop[]; current: Shop | null };

const ITEM = "flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm data-[selected=true]:bg-panel data-[selected=true]:shadow-[inset_2px_0_0_var(--color-accent)]";

/** Ctrl+K (⌘K on Mac) quick search for pages and shops, built on cmdk (the library behind shadcn's Command). */
export function CommandPalette({ shops, current }: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="flex w-full items-center justify-between border border-line px-3 py-1.5 text-sm text-muted hover:border-accent hover:text-ink">
        <span>Search</span>
        <kbd className="border border-line px-1 font-mono text-[11px]">Ctrl K</kbd>
      </button>
      <Command.Dialog
        open={open}
        onOpenChange={setOpen}
        label="Jump to a page or shop"
        overlayClassName="fixed inset-0 z-40 bg-bg/70"
        contentClassName="fixed left-1/2 top-[14vh] z-50 w-[min(32rem,92vw)] -translate-x-1/2 border border-line bg-panel-2 text-ink shadow-2xl"
      >
        <Command.Input placeholder="Jump to a page or shop…" className="w-full border-b border-line bg-transparent px-4 py-3 text-base placeholder:text-muted focus:outline-none" />
        <Command.List className="max-h-80 overflow-auto p-1.5">
          <Command.Empty className="px-3 py-6 text-center text-sm text-muted">No matches.</Command.Empty>
          {current && (
            <Command.Group heading={current.name} className="[&_[cmdk-group-heading]]:label [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5">
              {visibleNav(current.isDemo).map((item) => (
                <Command.Item key={item.slug} value={`${item.label} page`} onSelect={() => go(`/shops/${current.id}/${item.slug}`)} className={ITEM}>
                  {item.label}
                  <span className="text-xs text-muted">page</span>
                </Command.Item>
              ))}
            </Command.Group>
          )}
          <Command.Group heading="Shops" className="[&_[cmdk-group-heading]]:label [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5">
            {shops.map((s) => (
              <Command.Item key={s.id} value={`${s.name} ${shopTypeLabel(s.type)}`} onSelect={() => go(`/shops/${s.id}/overview`)} className={ITEM}>
                {s.name}
                <span className="text-xs text-muted">{shopTypeLabel(s.type)}</span>
              </Command.Item>
            ))}
          </Command.Group>
        </Command.List>
      </Command.Dialog>
    </>
  );
}
```

- [ ] **Step 5: Mount the palette in `web/src/components/shop/Sidebar.tsx`**

Add the import `import { CommandPalette } from "./CommandPalette";`, then replace the switcher block

```tsx
      <div className="my-4">
        <ShopSwitcher shops={shops} currentId={current?.id ?? null} />
      </div>
```

with

```tsx
      <div className="my-4 grid gap-2">
        <ShopSwitcher shops={shops} currentId={current?.id ?? null} />
        <CommandPalette shops={shops} current={current} />
      </div>
```

- [ ] **Step 6: Run the tests and the type check.**

Run: `pnpm exec vitest run src/components src/test && pnpm typecheck`

Expected: PASS (CommandPalette 2, Sidebar 2 with the updated mock, everything earlier), and typecheck exits 0. If cmdk complains about a missing browser API in jsdom, add the smallest stub to `src/test/setup.ts` and ledger a ruling.

- [ ] **Step 7: Commit, then run the mirror script.**

```bash
git add package.json pnpm-lock.yaml src/components
git commit -m "feat(web): Ctrl+K command palette for pages and shops" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Full verification, walkthrough and checkpoint docs

**Files:**
- Modify: `README.md` (repo root); `ERROR_LOG.md`, only if anything went wrong.

**Interfaces:**
- Consumes: everything above.
- Produces: the checkpoint 2 status line in the README, and a verified build.

- [ ] **Step 1: Run every check, the same as CI.**

Run: `pnpm lint && pnpm typecheck && pnpm test`

Expected:
- lint: no errors
- typecheck: exit 0
- tests: all pass (roughly 175 tests, 0 failed)

- [ ] **Step 2: Check free memory, then build.**

Run: `powershell -NoProfile -Command "(Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory/1MB"`, then `pnpm build`

Expected:
- Free memory is about 1 GB or more. If not, ask the user to close heavy apps before building.
- `✓ Compiled successfully`, with ◐ routes for `overview`, `topics`, `aspects`, `reviews`, `ask` and `try`, and ƒ routes for the three `/api/shops/[shopId]/…` handlers.
- If the build reports "Uncached data was accessed outside of `<Suspense>`", a `params` read escaped its boundary. Fix it as described in Global Constraints.

- [ ] **Step 3: Walk through it in the browser.**

Run `pnpm start -p 3000` in the background (lighter than dev mode). In Chrome, check:

1. **The sidebar.** It lists Overview, Topics, Aspects, Reviews, Ask and Try it, and the active page is highlighted.
2. **Topics.** The bubbles pop in. Clicking one updates the detail panel (keywords, sparkline, reviews). "Mostly complaints" dims the other bubbles.
3. **Aspects.** Clicking a bar slides in the drawer with highlighted sentences. Esc, Close and a backdrop click all close it, and focus returns to the page.
4. **Reviews.**
   - The sentiment chips, aspect select, sort and search all update the list, and rows slide into place.
   - "Load more" appends reviews.
   - A search for "zzz" shows the empty state.
5. **Ask.** A suggested question streams in word by word, the citation buttons scroll to their sources, and "What's the weather?" gets the polite decline.
6. **Try it.** An example fills the box, the needle moves, words light up and aspect tags appear. Clearing the box removes the result.
7. **Ctrl+K.** It opens the palette. Typing "volt" and pressing Enter goes to VoltHome.
8. **No console errors** on any page.

Take screenshots for the user, then stop the server.

- [ ] **Step 4: Update the README status line.** Replace it with:

```markdown
> **Status:** 🚧 Part 1 (frontend with mock data): **checkpoint 2 done**. Topics, Aspects (with a reviews drawer), Reviews, Ask, Try it and a Ctrl+K palette, on top of checkpoint 1's design system and Overview. See [the spec](docs/superpowers/specs/2026-10-30-frontend-mock-design.md).
```

- [ ] **Step 5: Log any incidents** in `ERROR_LOG.md`, in the existing format.

- [ ] **Step 6: Commit, then run the mirror script.** Run from the repo root:

```bash
git add README.md ERROR_LOG.md
git commit -m "docs: checkpoint 2 status" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 7: STOP for the checkpoint review.** Summarise what was built, how to run and verify it, the screenshots, the rulings, deferred minors and any incidents. Then wait for the user's go-ahead before Checkpoint 3.
