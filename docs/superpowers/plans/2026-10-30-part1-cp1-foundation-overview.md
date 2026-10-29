# Part 1 · Checkpoint 1: Foundation + Overview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Tropical design foundation, the typed data contract with deterministic mock data, the shop app shell, and a fully interactive Overview page in `web/`.

**Architecture:**
- Server components load data through one `DataSource` interface (`@/lib/data`). For now that interface is backed by seeded mock data.
- Client components receive plain data. They recompute range statistics with pure functions from `@/lib/data/derive`.
- Charts are custom SVG, with d3 used for the maths only.
- Every read of URL params sits inside `<Suspense>`, because `cacheComponents` is on.

**Tech Stack:**
- Next.js 16.4 (App Router, `cacheComponents: true`), React 19.3, TypeScript 5, Tailwind CSS 4
- zod 4, d3-scale, d3-shape
- vitest 5, React Testing Library, jsdom
- pnpm 10

**Spec:** `docs/superpowers/specs/2026-10-30-frontend-mock-design.md`

**Deliberate deviations from the spec, kept small:**
- `DataSource.getReviewsByIds` is added now. The paginated `getReviews` arrives in Checkpoint 2.
- `MonthPoint` gains an optional `stars` (counts for 1★–5★), so star stats can follow the selected range.
- Only the schemas this checkpoint uses are defined. Upload, alert, share and chat schemas come with their checkpoints.
- Numbers count up when the range changes, not on first load. The server-rendered HTML always shows the real numbers.
- Owner shops are reachable without login until Checkpoint 3 adds mock auth. The demo bar links to `/` until `/signup` exists.
- `motion`, `d3-force` and shadcn/ui are installed in Checkpoint 2, where they are first needed (drawer, bubbles, Ctrl+K).

## Global Constraints

- Work in `C:\dev\review-intel\web`, on branch `feat/frontend-mock`. Use `pnpm` only. Node ≥ 22.
- **Next.js 16 + `cacheComponents: true`:**
  - Never `await params`, `cookies()` or `headers()` at the top level of a page or layout. Do it in a child component wrapped in `<Suspense>`.
  - `error.tsx` receives `{ error, retry }`, not `reset`.
  - Read `web/node_modules/next/dist/docs/` before using any other Next API.
- **Colours come only from the CSS tokens** in `src/app/globals.css` (`bg`, `panel`, `panel-2`, `line`, `ink`, `muted`, `pos`, `neg`, `accent`, `info`). No hex values in `src/components/**`. A test enforces this.
- **No shop-type-specific wording in components.** Aspect names, counts and examples always come from data.
- **Animations:** ≤ 0.7 s each. Global CSS disables them under `prefers-reduced-motion`, and `useCountUp` respects it too.
- **Client components (`"use client"`) never import `@/lib/data` or `@/lib/data/mock/*`.** Otherwise the whole mock database would be shipped to the browser. They may import types from `@/lib/data/schemas` and functions from `@/lib/data/derive` and `@/lib/format`.
- **Component tests** start with `// @vitest-environment jsdom`. Logic tests run in the default `node` environment.
- **Do not install anything beyond Task 1's list** without asking the user.
- **Commits:** small, `type: description` style. Every commit message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Never use `--no-verify`.
- **After every commit**, refresh the OneDrive mirror:
  `powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\HP\OneDrive\Desktop\Academics\PROJECTS\DS_ML_MODEL\.claude\mirror-review-intel.ps1"`
- **Any error:** capture it → diagnose the root cause in 2–3 sentences → apply the smallest fix → re-run → log it in `ERROR_LOG.md`. After 3 failed attempts on the same error, stop and ask.

## Review Focus

1. **Unknown shop id in the URL** (`/shops/nope/overview`) → a "Shop not found" page, never a crash. Pinned in Task 8 (`requireShop` test).
2. **Click without dragging, or dragging right-to-left on the timeline** → a click changes nothing, and a reversed drag gives an ordered range. Pinned in Task 6.
3. **Shop data without star ratings** → average stars shows "—" and the donut shows "No star ratings in this data". Never `NaN`. Pinned in Tasks 3, 5 and 7.
4. **A selected range whose months have zero reviews** → an empty state with "Show all time". Percentages are `null`/"—", never `NaN%`. Pinned in Tasks 3 and 9.
5. **Text containing HTML, and very long names** (review quotes, headline parts, aspect names) → rendered as plain text; long names are truncated with a `title` tooltip. Pinned in Tasks 5 and 7.

---

## File map

```
web/
  package.json                         modify: deps (Task 1)
  vitest.config.mts                    modify: tsx tests, React plugin, setup (Task 1)
  next.config.ts                       modify: /shops/:id → overview redirect (Task 8)
  src/test/setup.ts                    create: RTL cleanup (Task 1)
  src/test/tooling.test.tsx            create: jsdom + JSX smoke test (Task 1)
  src/test/tokens.test.ts              create: token + no-hex guard (Task 1)
  src/app/globals.css                  rewrite: Tropical tokens, light tokens, keyframes (Task 1)
  src/app/layout.tsx                   modify: fonts + metadata (Task 1)
  src/app/page.tsx                     rewrite: temporary start page listing shops (Task 10)
  src/lib/data/schemas.ts(+test)       create: zod contract (Task 2)
  src/lib/format.ts(+test)             create: formatters (Task 3)
  src/lib/data/derive.ts(+test)        create: pure range maths + headline builder (Task 3)
  src/lib/data/mock/rng.ts(+test)      create: seeded RNG, splitInt (Task 4)
  src/lib/data/mock/shops.ts           create: 5 shop definitions (Task 4)
  src/lib/data/mock/build.ts           create: generator (Task 4)
  src/lib/data/mock/index.ts           create: mock DataSource (Task 4)
  src/lib/data/mock/mock.test.ts       create: contract + determinism tests (Task 4)
  src/lib/data/index.ts                create: DataSource interface + `data` export (Task 4)
  src/lib/data/load.ts(+test)          create: requireShop (Task 8)
  src/components/motion/usePrefersReducedMotion.ts   create (Task 5)
  src/components/motion/useCountUp.ts(+test)         create (Task 5)
  src/components/shop/Headline.tsx(+test)            create (Task 5)
  src/components/shop/KpiRow.tsx(+test)              create (Task 5)
  src/components/charts/timeline-geometry.ts(+test)  create (Task 6)
  src/components/charts/TimelineChart.tsx(+test)     create (Task 6)
  src/components/charts/AspectBars.tsx(+test)        create (Task 7)
  src/components/charts/StarDonut.tsx(+test)         create (Task 7)
  src/components/shop/TopComplaints.tsx(+test)       create (Task 7)
  src/components/shop/shop-nav.ts                    create (Task 8)
  src/components/shop/ShopSwitcher.tsx(+test)        create (Task 8)
  src/components/shop/Sidebar.tsx(+test)             create (Task 8)
  src/components/shop/DemoBar.tsx(+test)             create (Task 8)
  src/app/(app)/shops/[shopId]/layout.tsx            create (Task 8)
  src/app/(app)/shops/[shopId]/not-found.tsx         create (Task 8)
  src/app/(app)/shops/[shopId]/error.tsx             create (Task 8)
  src/components/shop/OverviewView.tsx(+test)        create (Task 9)
  src/components/shop/OverviewSkeleton.tsx           create (Task 9)
  src/app/(app)/shops/[shopId]/overview/page.tsx     create (Task 9)
README.md, ERROR_LOG.md                              modify (Task 10)
```

All commands below run from `C:\dev\review-intel\web` unless stated otherwise.

---

### Task 1: Tooling, Tropical tokens and fonts

**Files:**
- Modify: `web/package.json` (via pnpm), `web/vitest.config.mts`, `web/src/app/globals.css`, `web/src/app/layout.tsx`
- Create: `web/src/test/setup.ts`, `web/src/test/tooling.test.tsx`, `web/src/test/tokens.test.ts`

**Interfaces:**
- Produces:
  - Tailwind colour utilities `bg-bg`, `bg-panel`, `bg-panel-2`, `border-line`, `text-ink`, `text-muted`, `text-pos`, `text-neg`, `text-accent`, `text-info`, plus `fill-*`/`stroke-*` and `/opacity` variants.
  - Font utilities `font-sans`, `font-mono`, `font-serif`.
  - CSS classes `.label`, `.skeleton`, `.animate-draw`, `.animate-grow`, `.animate-fade-rise`, `.theme-light`.
  - Tests may use `*.test.tsx` and the jsdom environment.

- [ ] **Step 1: Install dependencies** (approved by the user on 2026-10-30)

```bash
pnpm add d3-scale d3-shape
pnpm add -D @types/d3-scale @types/d3-shape @testing-library/react @testing-library/user-event jsdom @vitejs/plugin-react
```
Expected: pnpm prints the added packages, and `pnpm-lock.yaml` changes.

- [ ] **Step 2: Write the failing tests**

`web/src/test/tooling.test.tsx`:
```tsx
// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

it("renders JSX into a jsdom document", () => {
  render(<p>tooling works</p>);
  expect(screen.getByText("tooling works")).toBeTruthy();
});
```

`web/src/test/tokens.test.ts`:
```ts
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SRC = fileURLToPath(new URL("..", import.meta.url));
const TOKENS = ["bg", "panel", "panel-2", "line", "ink", "muted", "pos", "neg", "accent", "info"];

describe("design tokens", () => {
  const css = readFileSync(path.join(SRC, "app/globals.css"), "utf8");

  it.each(TOKENS)("defines --color-%s for both the dark and light theme", (token) => {
    const found = css.match(new RegExp(`--color-${token}:`, "g")) ?? [];
    expect(found).toHaveLength(2);
  });

  it("components never hard-code hex colours", () => {
    const dir = path.join(SRC, "components");
    const files = existsSync(dir) ? (readdirSync(dir, { recursive: true }) as string[]) : [];
    const offenders = files.filter(
      (f) =>
        /\.tsx?$/.test(f) &&
        !/\.test\.tsx?$/.test(f) &&
        /#[0-9a-fA-F]{3,8}\b/.test(readFileSync(path.join(dir, f), "utf8")),
    );
    expect(offenders).toEqual([]);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm exec vitest run src/test`
Expected: FAIL. The `.tsx` file is not collected by the current `include`, and the token test fails because `--color-bg` is not defined.

- [ ] **Step 4: Update the vitest config and add the setup file**

`web/vitest.config.mts`:
```ts
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./src/test/setup.ts"],
  },
});
```

`web/src/test/setup.ts`:
```ts
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Unmount whatever a component test rendered, so tests never see each other's DOM.
afterEach(() => cleanup());
```

- [ ] **Step 5: Rewrite `web/src/app/globals.css`**

```css
@import "tailwindcss";

/* Tropical palette. Components use these tokens only, never raw hex values
   (enforced by src/test/tokens.test.ts). */
@theme {
  --color-bg: #05252a;
  --color-panel: #0a3238;
  --color-panel-2: #041d21;
  --color-line: #16505a;
  --color-ink: #effcfa;
  --color-muted: #8fbfbd;
  --color-pos: #22e39b;
  --color-neg: #ff5a36;
  --color-accent: #ffcf33;
  --color-info: #3ad0ff;

  --font-sans: var(--font-plex-sans), system-ui, sans-serif;
  --font-mono: var(--font-plex-mono), ui-monospace, monospace;
  --font-serif: var(--font-source-serif), Georgia, serif;
}

/* Light variant for shared reports and printing: same roles, light values. */
.theme-light {
  --color-bg: #fffdf8;
  --color-panel: #ffffff;
  --color-panel-2: #f5f2ea;
  --color-line: #e6e0d4;
  --color-ink: #14161c;
  --color-muted: #5f6370;
  --color-pos: #00a862;
  --color-neg: #d9381e;
  --color-accent: #b98900;
  --color-info: #0070f3;
}

body {
  background: var(--color-bg);
  color: var(--color-ink);
  font-family: var(--font-sans);
}

.label {
  font-size: 10.5px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-muted);
}

@keyframes draw {
  from { stroke-dashoffset: 1; }
  to { stroke-dashoffset: 0; }
}
@keyframes grow {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}
@keyframes fade-rise {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: none; }
}
@keyframes shimmer {
  from { background-position: 100% 0; }
  to { background-position: -50% 0; }
}

/* Use with pathLength={1} on the <path> so the dash covers the whole line. */
.animate-draw { stroke-dasharray: 1; stroke-dashoffset: 1; animation: draw 0.7s ease-out forwards; }
.animate-grow { animation: grow 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) both; }
.animate-fade-rise { animation: fade-rise 0.35s ease-out both; }
.skeleton {
  background: linear-gradient(90deg, var(--color-panel) 0, var(--color-line) 40%, var(--color-panel) 80%);
  background-size: 300% 100%;
  animation: shimmer 1.4s linear infinite;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-delay: 0ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 6: Update `web/src/app/layout.tsx` with the fonts**

```tsx
import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const sans = IBM_Plex_Sans({ variable: "--font-plex-sans", subsets: ["latin"], weight: ["400", "500", "600"] });
const mono = IBM_Plex_Mono({ variable: "--font-plex-mono", subsets: ["latin"], weight: ["400", "500"] });
const serif = Source_Serif_4({ variable: "--font-source-serif", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Review Intelligence",
  description: "Find out what your customers actually complain about: sentiment, aspects and topics from your reviews.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} ${serif.variable} h-full antialiased`}>
      <body className="min-h-full bg-bg font-sans text-ink">{children}</body>
    </html>
  );
}
```

- [ ] **Step 7: Run the tests and the type check**

Run: `pnpm exec vitest run src/test && pnpm typecheck`
Expected: all tests PASS and typecheck exits 0.

- [ ] **Step 8: Commit and mirror**

```bash
git add package.json pnpm-lock.yaml vitest.config.mts src/test src/app/globals.css src/app/layout.tsx
git commit -m "feat(web): Tropical design tokens, fonts and component-test tooling" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
Then run the mirror script (Global Constraints).

---

### Task 2: Data contract (zod schemas)

**Files:**
- Create: `web/src/lib/data/schemas.ts`
- Test: `web/src/lib/data/schemas.test.ts`

**Interfaces:**
- Produces:
  - Schemas: `ShopTypeSchema`, `ToneSchema`, `ShopSchema`, `HeadlineSchema`, `MonthPointSchema`, `KpisSchema`, `OverviewSchema`, `AspectSchema`, `ReviewSchema`.
  - Types: `ShopType`, `Tone`, `Shop`, `Headline`, `MonthPoint`, `Kpis`, `Overview`, `Aspect`, `Review`.
  - Constant: `MONTH_KEY` (regex for `YYYY-MM`).

- [ ] **Step 1: Write the failing test** (`web/src/lib/data/schemas.test.ts`)

```ts
import { describe, expect, it } from "vitest";
import { HeadlineSchema, MonthPointSchema, ReviewSchema, ShopSchema } from "./schemas";

const point = { month: "2026-10", count: 10, pos: 7, neg: 2, neu: 1, stars: [1, 1, 1, 3, 4] };

describe("data contract", () => {
  it("accepts a valid month point", () => {
    expect(MonthPointSchema.parse(point)).toEqual(point);
  });

  it("rejects a month point whose sentiment counts don't add up", () => {
    expect(() => MonthPointSchema.parse({ ...point, neu: 5 })).toThrow(/must equal count/);
  });

  it("rejects star counts that don't add up to the review count", () => {
    expect(() => MonthPointSchema.parse({ ...point, stars: [0, 0, 0, 0, 1] })).toThrow(/add up to count/);
  });

  it("rejects a malformed month key", () => {
    expect(() => MonthPointSchema.parse({ ...point, month: "2026-13" })).toThrow(/YYYY-MM/);
  });

  it("requires at least one headline part", () => {
    expect(() => HeadlineSchema.parse({ parts: [] })).toThrow();
  });

  it("rejects an aspect mention that points outside the review text", () => {
    const review = {
      id: "r1", date: "2026-10-01", stars: 2, text: "Too slow", sentiment: "negative", confidence: 0.9,
      aspectMentions: [{ aspectId: "speed", start: 4, end: 40, sentiment: "negative" }],
    };
    expect(() => ReviewSchema.parse(review)).toThrow(/inside the text/);
  });

  it("accepts a shop without an upload date", () => {
    const shop = {
      id: "s1", name: "Corner Cafe", type: "restaurant", isDemo: true, reviewCount: 3,
      dateRange: { from: "2026-01", to: "2026-10" }, unreadAlerts: 0,
    };
    expect(ShopSchema.parse(shop).name).toBe("Corner Cafe");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm exec vitest run src/lib/data/schemas.test.ts`
Expected: FAIL with "Failed to resolve import ./schemas".

- [ ] **Step 3: Implement `web/src/lib/data/schemas.ts`**

```ts
import { z } from "zod";

// The data contract: every screen receives data in exactly these shapes, whether it
// comes from mock files (now) or the real API (later parts). One definition gives
// both the TypeScript types and runtime validation.

export const MONTH_KEY = /^\d{4}-(0[1-9]|1[0-2])$/;
const monthKey = z.string().regex(MONTH_KEY, "expected YYYY-MM");
const isoDate = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, "expected YYYY-MM-DD");
const count = z.number().int().nonnegative();
const percent = z.number().min(0).max(100);

export const ShopTypeSchema = z.enum(["restaurant", "grocery", "electronics", "clothing", "salon", "other"]);
export const ToneSchema = z.enum(["positive", "negative", "neutral"]);

export const ShopSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: ShopTypeSchema,
  isDemo: z.boolean(),
  reviewCount: count,
  dateRange: z.object({ from: monthKey, to: monthKey }),
  lastUploadAt: isoDate.optional(),
  unreadAlerts: count,
});

// Structured parts, never HTML: owner-uploaded text must not be able to inject markup.
export const HeadlineSchema = z.object({
  parts: z.array(z.object({ text: z.string().min(1), tone: ToneSchema.optional() })).min(1),
});

export const MonthPointSchema = z
  .object({
    month: monthKey,
    count,
    pos: count,
    neg: count,
    neu: count,
    // Review counts for 1★..5★; null when the data has no star ratings.
    stars: z.array(count).length(5).nullable().optional(),
  })
  .refine((p) => p.pos + p.neg + p.neu === p.count, { message: "pos + neg + neu must equal count" })
  .refine((p) => !p.stars || p.stars.reduce((a, b) => a + b, 0) === p.count, {
    message: "star counts must add up to count",
  });

export const KpisSchema = z.object({
  reviews: count,
  positivePct: percent.nullable(),
  negativePct: percent.nullable(),
  avgStars: z.number().min(1).max(5).nullable(),
});

export const OverviewSchema = z.object({
  shopId: z.string().min(1),
  headline: HeadlineSchema,
  kpis: KpisSchema,
  monthly: z.array(MonthPointSchema).min(1),
  starMix: z.array(count).length(5).nullable(),
  topComplaints: z.array(
    z.object({ aspectId: z.string().min(1), negPct: percent, quoteReviewId: z.string().nullable() }),
  ),
});

export const AspectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  group: z.string().optional(),
  mentions: count,
  posPct: percent,
  negPct: percent,
  neuPct: percent,
  monthly: z.array(MonthPointSchema),
  isNew: z.boolean().optional(),
  exampleReviewIds: z.array(z.string()),
});

export const ReviewSchema = z
  .object({
    id: z.string().min(1),
    date: isoDate,
    stars: z.number().int().min(1).max(5).nullable(),
    text: z.string().min(1),
    sentiment: ToneSchema,
    confidence: z.number().min(0).max(1),
    helpful: count.optional(),
    aspectMentions: z.array(
      z.object({ aspectId: z.string().min(1), start: count, end: count, sentiment: ToneSchema }),
    ),
  })
  .refine((r) => r.aspectMentions.every((m) => m.start < m.end && m.end <= r.text.length), {
    message: "aspect mention span must fall inside the text",
  });

export type ShopType = z.infer<typeof ShopTypeSchema>;
export type Tone = z.infer<typeof ToneSchema>;
export type Shop = z.infer<typeof ShopSchema>;
export type Headline = z.infer<typeof HeadlineSchema>;
export type MonthPoint = z.infer<typeof MonthPointSchema>;
export type Kpis = z.infer<typeof KpisSchema>;
export type Overview = z.infer<typeof OverviewSchema>;
export type Aspect = z.infer<typeof AspectSchema>;
export type Review = z.infer<typeof ReviewSchema>;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run src/lib/data/schemas.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit and mirror**

```bash
git add src/lib/data/schemas.ts src/lib/data/schemas.test.ts
git commit -m "feat(web): zod data contract for shops, overview, aspects and reviews" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
Then run the mirror script.

---

### Task 3: Formatters and range maths

**Files:**
- Create: `web/src/lib/format.ts`, `web/src/lib/data/derive.ts`
- Test: `web/src/lib/format.test.ts`, `web/src/lib/data/derive.test.ts`

**Interfaces:**
- Consumes: the types from Task 2.
- Produces:
  - `format.ts`:
    - `fmtInt(n: number): string`
    - `fmtPct(n: number | null, digits?: number): string`
    - `fmtStars(n: number | null): string`
    - `fmtMonth(key: string): string`
    - `fmtSigned(n: number | null): string`
    - `shopTypeLabel(t: ShopType): string`
  - `derive.ts` types:
    - `MonthRange = { from: string; to: string }`
    - `RangeSummary = { reviews: number; positivePct: number | null; negativePct: number | null; neutralPct: number | null; starMix: number[] | null; avgStars: number | null }`
    - `AspectRow = { id: string; name: string; mentions: number; posPct: number; negPct: number }`
    - `ComplaintItem = { aspectId: string; name: string; negPct: number; quote: string | null }`
  - `derive.ts` functions:
    - `round1(n: number): number`
    - `fullRange(monthly: MonthPoint[]): MonthRange`
    - `normalizeRange(monthly: MonthPoint[], range?: Partial<MonthRange>): MonthRange`
    - `sliceMonths(monthly: MonthPoint[], range: MonthRange): MonthPoint[]`
    - `sameRange(a: MonthRange, b: MonthRange): boolean`
    - `lastMonths(monthly: MonthPoint[], n: number): MonthRange`
    - `summarize(points: MonthPoint[]): RangeSummary`
    - `toKpis(s: RangeSummary): Kpis`
    - `netScore(pos: number | null, neg: number | null): number | null`
    - `aspectInRange(a: Aspect, range: MonthRange): Aspect`
    - `aspectRows(aspects: Aspect[], range: MonthRange): AspectRow[]`
    - `topComplaints(rows: AspectRow[], reviews: Review[], range: MonthRange, limit?: number): ComplaintItem[]`
    - `rangeHeadline(range: MonthRange, summary: RangeSummary, worstAspect: string | null): Headline`

- [ ] **Step 1: Write the failing tests**

`web/src/lib/format.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { fmtInt, fmtMonth, fmtPct, fmtSigned, fmtStars, shopTypeLabel } from "./format";

describe("formatters", () => {
  it("formats integers with thousands separators", () => expect(fmtInt(8412)).toBe("8,412"));
  it("formats percentages and shows a dash for missing values", () => {
    expect(fmtPct(71.43)).toBe("71.4%");
    expect(fmtPct(null)).toBe("—");
  });
  it("formats star averages", () => {
    expect(fmtStars(4.123)).toBe("4.12");
    expect(fmtStars(null)).toBe("—");
  });
  it("formats month keys", () => {
    expect(fmtMonth("2026-10")).toBe("Oct 2026");
    expect(fmtMonth("2024-01")).toBe("Jan 2024");
  });
  it("signs numbers with a real minus sign", () => {
    expect(fmtSigned(12)).toBe("+12");
    expect(fmtSigned(-12)).toBe("\u221212");
    expect(fmtSigned(0)).toBe("0");
    expect(fmtSigned(null)).toBe("—");
  });
  it("labels shop types", () => expect(shopTypeLabel("electronics")).toBe("Electronics & appliances"));
});
```

`web/src/lib/data/derive.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import {
  aspectRows, fullRange, lastMonths, netScore, normalizeRange, rangeHeadline, sliceMonths,
  summarize, toKpis, topComplaints,
} from "./derive";
import type { Aspect, MonthPoint, Review } from "./schemas";

const mp = (month: string, count: number, pos: number, neg: number, stars: number[] | null = null): MonthPoint => ({
  month, count, pos, neg, neu: count - pos - neg, stars,
});
const series = [
  mp("2026-01", 10, 7, 2, [1, 1, 1, 3, 4]),
  mp("2026-02", 0, 0, 0, [0, 0, 0, 0, 0]),
  mp("2026-03", 20, 10, 8, [5, 3, 2, 4, 6]),
];

describe("ranges", () => {
  it("covers the whole series by default", () => {
    expect(fullRange(series)).toEqual({ from: "2026-01", to: "2026-03" });
    expect(normalizeRange(series)).toEqual({ from: "2026-01", to: "2026-03" });
  });
  it("puts a reversed range in order", () => {
    expect(normalizeRange(series, { from: "2026-03", to: "2026-01" })).toEqual({ from: "2026-01", to: "2026-03" });
  });
  it("clamps a range to the months that exist", () => {
    expect(normalizeRange(series, { from: "2020-01", to: "2030-12" })).toEqual({ from: "2026-01", to: "2026-03" });
  });
  it("builds 'last N months' presets", () => {
    expect(lastMonths(series, 2)).toEqual({ from: "2026-02", to: "2026-03" });
    expect(lastMonths(series, 99)).toEqual({ from: "2026-01", to: "2026-03" });
  });
});

describe("summarize", () => {
  it("adds counts and computes percentages and stars", () => {
    const s = summarize(series);
    expect(s.reviews).toBe(30);
    expect(s.positivePct).toBeCloseTo(56.667, 2);
    expect(s.negativePct).toBeCloseTo(33.333, 2);
    expect(s.starMix).toEqual([6, 4, 3, 7, 10]);
    expect(s.avgStars).toBeCloseTo(101 / 30, 5);
  });
  it("returns nulls, never NaN, for a range with zero reviews", () => {
    expect(summarize(sliceMonths(series, { from: "2026-02", to: "2026-02" }))).toEqual({
      reviews: 0, positivePct: null, negativePct: null, neutralPct: null, starMix: null, avgStars: null,
    });
  });
  it("drops star stats when a month with reviews has no ratings", () => {
    const s = summarize([mp("2026-01", 10, 7, 2, null), mp("2026-02", 5, 3, 1, [0, 1, 1, 1, 2])]);
    expect(s.reviews).toBe(15);
    expect(s.starMix).toBeNull();
    expect(s.avgStars).toBeNull();
  });
  it("rounds KPIs for display", () => {
    expect(toKpis(summarize(series))).toEqual({ reviews: 30, positivePct: 56.7, negativePct: 33.3, avgStars: 3.37 });
  });
  it("computes a net score only when both sides are known", () => {
    expect(netScore(72.4, 10.1)).toBe(62);
    expect(netScore(null, 10)).toBeNull();
  });
});

const aspect = (id: string, name: string, monthly: MonthPoint[]): Aspect => ({
  id, name, mentions: 0, posPct: 0, negPct: 0, neuPct: 0, monthly, exampleReviewIds: [],
});
const review = (id: string, date: string, aspectId: string, sentiment: Review["sentiment"]): Review => ({
  id, date, stars: 2, text: `${id} about ${aspectId}`, sentiment, confidence: 0.9,
  aspectMentions: [{ aspectId, start: 0, end: 4, sentiment }],
});

describe("aspects and complaints", () => {
  const aspects = [
    aspect("wait", "Wait time", [mp("2026-01", 4, 1, 3), mp("2026-02", 0, 0, 0), mp("2026-03", 6, 2, 3)]),
    aspect("food", "Food", [mp("2026-01", 9, 8, 1), mp("2026-02", 0, 0, 0), mp("2026-03", 11, 9, 1)]),
    aspect("music", "Music", [mp("2026-01", 0, 0, 0), mp("2026-02", 0, 0, 0), mp("2026-03", 0, 0, 0)]),
  ];
  const range = fullRange(series);

  it("summarises each aspect for the range, drops unmentioned ones and sorts by mentions", () => {
    const rows = aspectRows(aspects, range);
    expect(rows.map((r) => r.id)).toEqual(["food", "wait"]);
    expect(rows[1]).toEqual({ id: "wait", name: "Wait time", mentions: 10, posPct: 30, negPct: 60 });
  });

  it("ranks complaints by negative share and prefers a quote from inside the range", () => {
    const reviews = [review("old", "2025-06-01", "wait", "negative"), review("new", "2026-03-04", "wait", "negative")];
    const items = topComplaints(aspectRows(aspects, range), reviews, range);
    expect(items[0]).toEqual({ aspectId: "wait", name: "Wait time", negPct: 60, quote: "new about wait" });
    expect(items[1].quote).toBeNull();
  });

  it("writes a range headline as structured parts", () => {
    const h = rangeHeadline({ from: "2026-01", to: "2026-03" }, summarize(series), "Wait time");
    expect(h.parts.map((p) => p.text).join("")).toBe(
      "From Jan 2026 to Mar 2026, 57% of reviews were positive. The biggest pain point was wait time.",
    );
    expect(h.parts.find((p) => p.tone === "negative")?.text).toBe("wait time");
  });

  it("says plainly when a range has no reviews", () => {
    const h = rangeHeadline({ from: "2026-02", to: "2026-02" }, summarize([series[1]]), null);
    expect(h.parts).toEqual([{ text: "No reviews between Feb 2026 and Feb 2026." }]);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm exec vitest run src/lib/format.test.ts src/lib/data/derive.test.ts`
Expected: FAIL with "Failed to resolve import ./format" and "./derive".

- [ ] **Step 3: Implement `web/src/lib/format.ts`**

```ts
import type { ShopType } from "@/lib/data/schemas";

// All number, percent and date formatting lives here, so every screen agrees.

const intFormat = new Intl.NumberFormat("en-US");

export function fmtInt(n: number): string {
  return intFormat.format(Math.round(n));
}

export function fmtPct(n: number | null, digits = 1): string {
  return n === null ? "—" : `${n.toFixed(digits)}%`;
}

export function fmtStars(n: number | null): string {
  return n === null ? "—" : n.toFixed(2);
}

/** "2026-10" → "Oct 2026" */
export function fmtMonth(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** +12, −12 (a real minus sign, U+2212), 0 */
export function fmtSigned(n: number | null): string {
  if (n === null) return "—";
  if (n > 0) return `+${n}`;
  if (n < 0) return `\u2212${Math.abs(n)}`;
  return "0";
}

const SHOP_TYPE_LABELS: Record<ShopType, string> = {
  restaurant: "Restaurant",
  grocery: "Grocery",
  electronics: "Electronics & appliances",
  clothing: "Clothing & fashion",
  salon: "Salon & spa",
  other: "Other",
};

export function shopTypeLabel(type: ShopType): string {
  return SHOP_TYPE_LABELS[type];
}
```

- [ ] **Step 4: Implement `web/src/lib/data/derive.ts`**

```ts
import { fmtMonth } from "@/lib/format";
import type { Aspect, Headline, Kpis, MonthPoint, Review } from "./schemas";

// Pure functions for time ranges. They are safe to import in client components
// (no data, no Node APIs), and the mock data source uses them too, so the server
// and the browser always compute the same numbers.

export type MonthRange = { from: string; to: string };

export type RangeSummary = {
  reviews: number;
  positivePct: number | null;
  negativePct: number | null;
  neutralPct: number | null;
  starMix: number[] | null;
  avgStars: number | null;
};

export type AspectRow = { id: string; name: string; mentions: number; posPct: number; negPct: number };
export type ComplaintItem = { aspectId: string; name: string; negPct: number; quote: string | null };

export const round1 = (n: number) => Math.round(n * 10) / 10;

/** Month keys are "YYYY-MM", so plain string comparison orders them correctly. */
export function fullRange(monthly: MonthPoint[]): MonthRange {
  if (monthly.length === 0) throw new Error("fullRange needs at least one month");
  return { from: monthly[0].month, to: monthly[monthly.length - 1].month };
}

export function normalizeRange(monthly: MonthPoint[], range?: Partial<MonthRange>): MonthRange {
  const all = fullRange(monthly);
  let from = range?.from ?? all.from;
  let to = range?.to ?? all.to;
  if (from > to) [from, to] = [to, from];
  from = from < all.from ? all.from : from > all.to ? all.to : from;
  to = to > all.to ? all.to : to < all.from ? all.from : to;
  return { from, to };
}

export function sliceMonths(monthly: MonthPoint[], range: MonthRange): MonthPoint[] {
  return monthly.filter((p) => p.month >= range.from && p.month <= range.to);
}

export function sameRange(a: MonthRange, b: MonthRange): boolean {
  return a.from === b.from && a.to === b.to;
}

export function lastMonths(monthly: MonthPoint[], n: number): MonthRange {
  const all = fullRange(monthly);
  return { from: monthly[Math.max(0, monthly.length - n)].month, to: all.to };
}

// Multiply first: (3 * 100) / 10 is exactly 30, while (3 / 10) * 100 is 30.000000000000004.
const pct = (part: number, whole: number) => (whole === 0 ? null : (part * 100) / whole);

export function summarize(points: MonthPoint[]): RangeSummary {
  let reviews = 0;
  let pos = 0;
  let neg = 0;
  let neu = 0;
  let stars: number[] | null = [0, 0, 0, 0, 0];
  for (const p of points) {
    reviews += p.count;
    pos += p.pos;
    neg += p.neg;
    neu += p.neu;
    if (p.stars && stars) {
      p.stars.forEach((c, i) => {
        stars![i] += c;
      });
    } else if (p.count > 0) {
      stars = null; // a month with reviews but no ratings: star stats would be misleading
    }
  }
  const rated = stars ? stars.reduce((a, b) => a + b, 0) : 0;
  return {
    reviews,
    positivePct: pct(pos, reviews),
    negativePct: pct(neg, reviews),
    neutralPct: pct(neu, reviews),
    starMix: stars && rated > 0 ? stars : null,
    avgStars: stars && rated > 0 ? stars.reduce((sum, c, i) => sum + c * (i + 1), 0) / rated : null,
  };
}

export function toKpis(s: RangeSummary): Kpis {
  return {
    reviews: s.reviews,
    positivePct: s.positivePct === null ? null : round1(s.positivePct),
    negativePct: s.negativePct === null ? null : round1(s.negativePct),
    avgStars: s.avgStars === null ? null : Math.round(s.avgStars * 100) / 100,
  };
}

export function netScore(positivePct: number | null, negativePct: number | null): number | null {
  if (positivePct === null || negativePct === null) return null;
  return Math.round(positivePct - negativePct);
}

export function aspectInRange(a: Aspect, range: MonthRange): Aspect {
  const monthly = sliceMonths(a.monthly, range);
  const s = summarize(monthly);
  return {
    ...a,
    monthly,
    mentions: s.reviews,
    posPct: round1(s.positivePct ?? 0),
    negPct: round1(s.negativePct ?? 0),
    neuPct: round1(s.neutralPct ?? 0),
  };
}

export function aspectRows(aspects: Aspect[], range: MonthRange): AspectRow[] {
  return aspects
    .map((a) => {
      const s = summarize(sliceMonths(a.monthly, range));
      return { id: a.id, name: a.name, mentions: s.reviews, posPct: s.positivePct ?? 0, negPct: s.negativePct ?? 0 };
    })
    .filter((r) => r.mentions > 0)
    .sort((x, y) => y.mentions - x.mentions);
}

export function topComplaints(rows: AspectRow[], reviews: Review[], range: MonthRange, limit = 3): ComplaintItem[] {
  return [...rows]
    .filter((r) => r.negPct > 0)
    .sort((x, y) => y.negPct - x.negPct)
    .slice(0, limit)
    .map((r) => {
      const negative = reviews.filter((rv) =>
        rv.aspectMentions.some((m) => m.aspectId === r.id && m.sentiment === "negative"),
      );
      const inRange = negative.find((rv) => {
        const month = rv.date.slice(0, 7);
        return month >= range.from && month <= range.to;
      });
      return { aspectId: r.id, name: r.name, negPct: r.negPct, quote: (inRange ?? negative[0])?.text ?? null };
    });
}

export function rangeHeadline(range: MonthRange, summary: RangeSummary, worstAspect: string | null): Headline {
  if (summary.reviews === 0 || summary.positivePct === null) {
    return { parts: [{ text: `No reviews between ${fmtMonth(range.from)} and ${fmtMonth(range.to)}.` }] };
  }
  const parts: Headline["parts"] = [
    { text: `From ${fmtMonth(range.from)} to ${fmtMonth(range.to)}, ` },
    { text: `${Math.round(summary.positivePct)}% of reviews were positive`, tone: "positive" },
    { text: "." },
  ];
  if (worstAspect) {
    parts.push({ text: " The biggest pain point was " }, { text: worstAspect.toLowerCase(), tone: "negative" }, { text: "." });
  }
  return { parts };
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm exec vitest run src/lib/format.test.ts src/lib/data/derive.test.ts`
Expected: PASS (6 + 14 tests).

- [ ] **Step 6: Commit and mirror**

```bash
git add src/lib/format.ts src/lib/format.test.ts src/lib/data/derive.ts src/lib/data/derive.test.ts
git commit -m "feat(web): formatters and pure range maths for KPIs, aspects and headlines" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
Then run the mirror script.

---

### Task 4: Seeded mock data and the DataSource

**Files:**
- Create: `web/src/lib/data/mock/rng.ts`, `web/src/lib/data/mock/shops.ts`, `web/src/lib/data/mock/build.ts`, `web/src/lib/data/mock/index.ts`, `web/src/lib/data/index.ts`
- Test: `web/src/lib/data/mock/rng.test.ts`, `web/src/lib/data/mock/mock.test.ts`

**Interfaces:**
- Consumes:
  - Task 2 schemas and types.
  - Task 3 `summarize`, `toKpis`, `fullRange`, `normalizeRange`, `sliceMonths`, `aspectInRange`, `round1`.
- Produces:
  - `rng.ts`:
    - `mulberry32(seed: number): () => number`
    - `seedFrom(text: string): number`
    - `splitInt(total: number, weights: number[]): number[]`
  - `shops.ts`: `SHOP_DEFS: ShopDef[]`, with shop ids `saffron-table`, `freshcart`, `volthome`, `spice-indiranagar`, `spice-koramangala`.
  - `build.ts`:
    - `ShopEntry = { shop: Shop; overview: Overview; aspects: Aspect[]; reviews: Review[] }`
    - `buildDb(defs: ShopDef[]): Map<string, ShopEntry>`
    - `monthKeys(from: string, n: number): string[]`
  - `index.ts` (data):
    - `interface DataSource { listShops(): Promise<Shop[]>; getShop(id: string): Promise<Shop | null>; getOverview(id: string, range?: Partial<MonthRange>): Promise<Overview | null>; getAspects(id: string, range?: Partial<MonthRange>): Promise<Aspect[] | null>; getReviewsByIds(id: string, ids: string[]): Promise<Review[]> }`
    - `const data: DataSource`

- [ ] **Step 1: Write the failing tests**

`web/src/lib/data/mock/rng.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { mulberry32, seedFrom, splitInt } from "./rng";

describe("seeded random numbers", () => {
  it("repeats the same sequence for the same seed", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
  it("stays within [0, 1)", () => {
    const r = mulberry32(seedFrom("freshcart"));
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
  it("gives different text different seeds", () => expect(seedFrom("a")).not.toBe(seedFrom("b")));
});

describe("splitInt", () => {
  it("splits a total proportionally and always adds up", () => {
    const parts = splitInt(10, [0.7, 0.2, 0.1]);
    expect(parts).toEqual([7, 2, 1]);
    expect(splitInt(7, [1, 1, 1]).reduce((a, b) => a + b, 0)).toBe(7);
  });
  it("returns zeros for a zero total", () => expect(splitInt(0, [0.5, 0.5])).toEqual([0, 0]));
  it("refuses a positive total with no positive weight", () => expect(() => splitInt(5, [0, 0])).toThrow());
});
```

`web/src/lib/data/mock/mock.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { sliceMonths } from "../derive";
import { AspectSchema, OverviewSchema, ReviewSchema, ShopSchema } from "../schemas";
import { buildDb } from "./build";
import { mockDataSource as ds } from "./index";
import { SHOP_DEFS } from "./shops";

describe("mock data", () => {
  it("is identical every time it is built", () => {
    expect(buildDb(SHOP_DEFS)).toEqual(buildDb(SHOP_DEFS));
  });

  it("has 3 demo shops and 2 owner shops across several shop types", async () => {
    const shops = await ds.listShops();
    expect(shops.filter((s) => s.isDemo)).toHaveLength(3);
    expect(shops.filter((s) => !s.isDemo)).toHaveLength(2);
    expect(new Set(shops.map((s) => s.type))).toEqual(new Set(["restaurant", "grocery", "electronics"]));
  });

  it.each(SHOP_DEFS.map((d) => d.id))("%s follows the data contract", async (id) => {
    ShopSchema.parse(await ds.getShop(id));
    OverviewSchema.parse(await ds.getOverview(id));
    const aspects = (await ds.getAspects(id))!;
    aspects.forEach((a) => AspectSchema.parse(a));
    const reviews = await ds.getReviewsByIds(id, aspects.flatMap((a) => a.exampleReviewIds));
    expect(reviews.length).toBeGreaterThan(0);
    reviews.forEach((r) => ReviewSchema.parse(r));
  });

  it("returns null for an unknown shop", async () => {
    expect(await ds.getShop("no-such-shop")).toBeNull();
    expect(await ds.getOverview("no-such-shop")).toBeNull();
    expect(await ds.getAspects("no-such-shop")).toBeNull();
    expect(await ds.getReviewsByIds("no-such-shop", ["x"])).toEqual([]);
  });

  it("recomputes the overview for a date range", async () => {
    const full = (await ds.getOverview("freshcart"))!;
    const range = { from: full.monthly[30].month, to: full.monthly[35].month };
    const part = (await ds.getOverview("freshcart", range))!;
    expect(part.monthly).toHaveLength(6);
    expect(part.kpis.reviews).toBe(sliceMonths(full.monthly, range).reduce((s, p) => s + p.count, 0));
  });

  it("finds different aspects for different shop types", async () => {
    const names = async (id: string) => (await ds.getAspects(id))!.map((a) => a.name);
    expect(await names("freshcart")).toContain("Freshness");
    expect(await names("volthome")).toContain("Installation");
    expect(await names("volthome")).not.toContain("Freshness");
  });

  it("marks an aspect that only appears recently as new", async () => {
    const spice = (await ds.getAspects("spice-indiranagar"))!.find((a) => a.id === "spice")!;
    expect(spice.isNew).toBe(true);
    expect(spice.monthly[0].count).toBe(0);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm exec vitest run src/lib/data/mock`
Expected: FAIL with "Failed to resolve import ./rng" (and ./build, ./index, ./shops).

- [ ] **Step 3: Implement `web/src/lib/data/mock/rng.ts`**

```ts
/** Seeded PRNG (mulberry32): the same seed gives the same sequence, so mock data never changes between runs. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a hash: turns a string such as a shop id into a numeric seed. */
export function seedFrom(text: string): number {
  let h = 2166136261;
  for (const ch of text) {
    h ^= ch.codePointAt(0)!;
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Splits an integer total in proportion to weights (largest remainder); parts always sum to total. */
export function splitInt(total: number, weights: number[]): number[] {
  if (total === 0) return weights.map(() => 0);
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0) throw new Error("splitInt needs at least one positive weight");
  const raw = weights.map((w) => (w / sum) * total);
  const out = raw.map(Math.floor);
  let rest = total - out.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => [r - Math.floor(r), i] as const).sort((x, y) => y[0] - x[0]);
  for (let k = 0; rest > 0; k++, rest--) out[order[k % order.length][1]]++;
  return out;
}
```

- [ ] **Step 4: Implement `web/src/lib/data/mock/shops.ts`**

```ts
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
```

- [ ] **Step 5: Implement `web/src/lib/data/mock/build.ts`**

```ts
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
```

- [ ] **Step 6: Implement `web/src/lib/data/mock/index.ts`**

```ts
import type { DataSource } from "../index";
import { aspectInRange, normalizeRange, sliceMonths, summarize, toKpis } from "../derive";
import { buildDb } from "./build";
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
};
```

- [ ] **Step 7: Implement `web/src/lib/data/index.ts`**

```ts
import type { MonthRange } from "./derive";
import { mockDataSource } from "./mock";
import type { Aspect, Overview, Review, Shop } from "./schemas";

// The single entry point every page uses for data. Server-side only: client
// components receive plain data as props and must never import this module.
export interface DataSource {
  listShops(): Promise<Shop[]>;
  getShop(id: string): Promise<Shop | null>;
  getOverview(id: string, range?: Partial<MonthRange>): Promise<Overview | null>;
  getAspects(id: string, range?: Partial<MonthRange>): Promise<Aspect[] | null>;
  getReviewsByIds(id: string, ids: string[]): Promise<Review[]>;
}

// The one line later parts change: swap the mock for the real API-backed source.
export const data: DataSource = mockDataSource;

export type { MonthRange } from "./derive";
export type * from "./schemas";
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `pnpm exec vitest run src/lib/data`
Expected: PASS. All schema, derive, rng and mock tests are green, including the 5 per-shop contract cases. If a "phrase ... is not in its text" error appears, the phrase in `shops.ts` doesn't match its review text. Fix the phrase, not the check.

- [ ] **Step 9: Commit and mirror**

```bash
git add src/lib/data
git commit -m "feat(web): seeded mock data for 5 shops behind a DataSource interface" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
Then run the mirror script.

---

### Task 5: Headline, KPI row and motion hooks

**Files:**
- Create: `web/src/components/motion/usePrefersReducedMotion.ts`, `web/src/components/motion/useCountUp.ts`, `web/src/components/shop/Headline.tsx`, `web/src/components/shop/KpiRow.tsx`
- Test: `web/src/components/motion/useCountUp.test.tsx`, `web/src/components/shop/Headline.test.tsx`, `web/src/components/shop/KpiRow.test.tsx`

**Interfaces:**
- Consumes:
  - `Headline` type (Task 2).
  - `RangeSummary` (Task 3).
  - `fmtInt`, `fmtPct`, `fmtStars` (Task 3).
- Produces:
  - `usePrefersReducedMotion(): boolean`
  - `useCountUp(target: number, durationMs?: number): number`
  - `<Headline headline={Headline} as?="p"|"h2" className?={string} />`
  - `<KpiRow summary={RangeSummary} baseline?={RangeSummary} />`

- [ ] **Step 1: Write the failing tests**

`web/src/components/motion/useCountUp.test.tsx`:
```tsx
// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useCountUp } from "./useCountUp";

const original = window.matchMedia;
afterEach(() => {
  window.matchMedia = original;
});

describe("useCountUp", () => {
  it("shows the real value immediately on first render", () => {
    const { result } = renderHook(() => useCountUp(42));
    expect(result.current).toBe(42);
  });

  it("jumps straight to new values when the user prefers reduced motion", () => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }) as unknown as typeof window.matchMedia;
    const { result, rerender } = renderHook(({ v }) => useCountUp(v), { initialProps: { v: 10 } });
    rerender({ v: 99 });
    expect(result.current).toBe(99);
  });

  it("settles on the new value after animating", async () => {
    const { result, rerender } = renderHook(({ v }) => useCountUp(v, 50), { initialProps: { v: 0 } });
    rerender({ v: 100 });
    await waitFor(() => expect(result.current).toBe(100));
  });
});
```

`web/src/components/shop/Headline.test.tsx`:
```tsx
// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Headline } from "./Headline";

describe("Headline", () => {
  it("highlights toned parts", () => {
    const { container } = render(
      <Headline headline={{ parts: [{ text: "Great food, but " }, { text: "slow service", tone: "negative" }, { text: "." }] }} />,
    );
    expect(container.textContent).toBe("Great food, but slow service.");
    expect(container.querySelector('[data-tone="negative"]')?.textContent).toBe("slow service");
  });

  it("renders markup inside data as plain text", () => {
    const { container } = render(
      <Headline headline={{ parts: [{ text: "<script>alert(1)</script>", tone: "negative" }] }} />,
    );
    expect(container.querySelector("script")).toBeNull();
    expect(container.textContent).toBe("<script>alert(1)</script>");
  });
});
```

`web/src/components/shop/KpiRow.test.tsx`:
```tsx
// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { RangeSummary } from "@/lib/data/derive";
import { KpiRow } from "./KpiRow";

const summary: RangeSummary = { reviews: 1234, positivePct: 60, negativePct: 25, neutralPct: 15, starMix: [1, 1, 1, 1, 1], avgStars: 4.1 };

describe("KpiRow", () => {
  it("shows the four headline numbers", () => {
    render(<KpiRow summary={summary} />);
    expect(screen.getByText("1,234")).toBeTruthy();
    expect(screen.getByText("60.0%")).toBeTruthy();
    expect(screen.getByText("25.0%")).toBeTruthy();
    expect(screen.getByText("4.10")).toBeTruthy();
  });

  it("shows a dash, not NaN, when there are no star ratings", () => {
    render(<KpiRow summary={{ ...summary, starMix: null, avgStars: null }} />);
    expect(screen.getByText("—")).toBeTruthy();
    expect(screen.queryByText(/NaN/)).toBeNull();
  });

  it("colours changes by whether they are good or bad", () => {
    const baseline: RangeSummary = { ...summary, positivePct: 59.7, negativePct: 20, avgStars: 4.1 };
    render(<KpiRow summary={summary} baseline={baseline} />);
    expect(screen.getByText("▲ 0.3 pts vs all time").className).toContain("text-pos");
    expect(screen.getByText("▲ 5.0 pts vs all time").className).toContain("text-neg");
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm exec vitest run src/components`
Expected: FAIL with "Failed to resolve import" for each module.

- [ ] **Step 3: Implement `web/src/components/motion/usePrefersReducedMotion.ts`**

```ts
"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

const getSnapshot = () => typeof window !== "undefined" && !!window.matchMedia && window.matchMedia(QUERY).matches;

/** True when the operating system asks for less motion (an accessibility setting). */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
```

- [ ] **Step 4: Implement `web/src/components/motion/useCountUp.ts`**

```ts
"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

/**
 * Shows `target` immediately on the first render (so server HTML has real numbers),
 * then eases from the previous value whenever `target` changes.
 */
export function useCountUp(target: number, durationMs = 600): number {
  const reduce = usePrefersReducedMotion();
  const [animated, setAnimated] = useState<number | null>(null);
  const previous = useRef(target);

  useEffect(() => {
    const from = previous.current;
    previous.current = target;
    if (reduce || from === target || typeof requestAnimationFrame === "undefined") return;
    const start = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      const k = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - k, 3);
      setAnimated(k < 1 ? from + (target - from) * eased : null);
      if (k < 1) frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs, reduce]);

  return animated === null || reduce ? target : animated;
}
```

- [ ] **Step 5: Implement `web/src/components/shop/Headline.tsx`**

```tsx
import { Fragment } from "react";
import type { Headline as HeadlineData } from "@/lib/data/schemas";

const TONE_CLASS = {
  negative: "bg-neg/15 px-1 text-neg",
  positive: "text-pos",
  neutral: "text-accent",
} as const;

type Props = { headline: HeadlineData; as?: "p" | "h2"; className?: string };

/** Renders structured parts as text. Never HTML, so data can't inject markup. */
export function Headline({ headline, as: Tag = "p", className = "" }: Props) {
  return (
    <Tag className={`font-serif text-2xl leading-snug text-ink ${className}`}>
      {headline.parts.map((part, i) =>
        part.tone ? (
          <em key={i} data-tone={part.tone} className={`not-italic ${TONE_CLASS[part.tone]}`}>
            {part.text}
          </em>
        ) : (
          <Fragment key={i}>{part.text}</Fragment>
        ),
      )}
    </Tag>
  );
}
```

- [ ] **Step 6: Implement `web/src/components/shop/KpiRow.tsx`**

```tsx
"use client";

import { useCountUp } from "@/components/motion/useCountUp";
import type { RangeSummary } from "@/lib/data/derive";
import { fmtInt, fmtPct, fmtStars } from "@/lib/format";

type Tint = "info" | "pos" | "neg" | "accent";
const CELL: Record<Tint, string> = { info: "bg-info/10", pos: "bg-pos/10", neg: "bg-neg/10", accent: "bg-accent/10" };
const VALUE: Record<Tint, string> = { info: "text-ink", pos: "text-pos", neg: "text-neg", accent: "text-accent" };

type Change = { text: string; good: boolean } | null;

function change(current: number | null, base: number | null | undefined, unit: "pts" | "", higherIsBetter: boolean, min: number): Change {
  if (current === null || base === null || base === undefined) return null;
  const d = current - base;
  if (Math.abs(d) < min) return null;
  const size = unit === "pts" ? `${Math.abs(d).toFixed(1)} pts` : Math.abs(d).toFixed(2);
  return { text: `${d > 0 ? "▲" : "▼"} ${size}`, good: higherIsBetter ? d > 0 : d < 0 };
}

type KpiProps = { label: string; value: number | null; format: (v: number) => string; tint: Tint; delta: Change };

function Kpi({ label, value, format, tint, delta }: KpiProps) {
  const shown = useCountUp(value ?? 0);
  return (
    <div className={`border-line px-3.5 py-3 not-last:border-r ${CELL[tint]}`}>
      <dt className="label">{label}</dt>
      <dd className={`m-0 font-mono text-2xl ${VALUE[tint]}`}>{value === null ? "—" : format(shown)}</dd>
      <dd className={`m-0 h-4 font-mono text-[11.5px] ${delta ? (delta.good ? "text-pos" : "text-neg") : ""}`}>
        {delta ? `${delta.text} vs all time` : ""}
      </dd>
    </div>
  );
}

type Props = { summary: RangeSummary; baseline?: RangeSummary };

export function KpiRow({ summary, baseline: b }: Props) {
  return (
    <>
      <dl className="mt-5 grid grid-cols-2 border border-line md:grid-cols-4">
        <Kpi label="Reviews" value={summary.reviews} format={fmtInt} tint="info" delta={null} />
        <Kpi label="Positive" value={summary.positivePct} format={(v) => fmtPct(v)} tint="pos"
          delta={b ? change(summary.positivePct, b.positivePct, "pts", true, 0.05) : null} />
        <Kpi label="Negative" value={summary.negativePct} format={(v) => fmtPct(v)} tint="neg"
          delta={b ? change(summary.negativePct, b.negativePct, "pts", false, 0.05) : null} />
        <Kpi label="Avg stars" value={summary.avgStars} format={fmtStars} tint="accent"
          delta={b ? change(summary.avgStars, b.avgStars, "", true, 0.005) : null} />
      </dl>
      {/* Announces the final numbers once, instead of every count-up frame. */}
      <p className="sr-only" aria-live="polite">
        {`${fmtInt(summary.reviews)} reviews, ${fmtPct(summary.positivePct)} positive, ${fmtPct(summary.negativePct)} negative, average stars ${fmtStars(summary.avgStars)}.`}
      </p>
    </>
  );
}
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `pnpm exec vitest run src/components src/test`
Expected: PASS (useCountUp 3, Headline 2, KpiRow 3, plus the token guard still green).

- [ ] **Step 8: Commit and mirror**

```bash
git add src/components
git commit -m "feat(web): headline, KPI row and reduced-motion-aware count-up" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
Then run the mirror script.

---

### Task 6: Timeline chart with drag-to-select

**Files:**
- Create: `web/src/components/charts/timeline-geometry.ts`, `web/src/components/charts/TimelineChart.tsx`
- Test: `web/src/components/charts/timeline-geometry.test.ts`, `web/src/components/charts/TimelineChart.test.tsx`

**Interfaces:**
- Consumes:
  - `MonthPoint` (Task 2).
  - `MonthRange`, `fullRange` (Task 3).
  - `fmtInt`, `fmtMonth`, `fmtPct` (Task 3).
- Produces:
  - Constants: `TL_WIDTH = 800`, `TL_HEIGHT = 200`.
  - `timelinePaths(monthly: MonthPoint[], width?: number, height?: number): { posLine: string; negLine: string; posArea: string; negArea: string; xAt: (i: number) => number }`
  - `indexFromX(px: number, width: number, count: number): number`
  - `rangeFromIndices(monthly: MonthPoint[], a: number, b: number): MonthRange`
  - `timelineSummary(monthly: MonthPoint[]): string`
  - `<TimelineChart monthly={MonthPoint[]} range={MonthRange} onRangeChange={(r: MonthRange) => void} />`

- [ ] **Step 1: Write the failing tests**

`web/src/components/charts/timeline-geometry.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import type { MonthPoint } from "@/lib/data/schemas";
import { indexFromX, rangeFromIndices, timelinePaths, timelineSummary } from "./timeline-geometry";

const monthly: MonthPoint[] = Array.from({ length: 36 }, (_, i) => {
  const d = new Date(Date.UTC(2023, 10 + i, 1));
  const month = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  return { month, count: 100, pos: 70, neg: 20, neu: 10, stars: null };
});

describe("timeline geometry", () => {
  it("builds line and area paths across the full width", () => {
    const p = timelinePaths(monthly);
    expect(p.posLine.startsWith("M")).toBe(true);
    expect(p.posArea).toContain("Z");
    expect(p.xAt(0)).toBe(0);
    expect(p.xAt(35)).toBe(800);
  });

  it("leaves a gap for a month with no reviews", () => {
    const gappy = monthly.map((m, i) => (i === 10 ? { ...m, count: 0, pos: 0, neg: 0, neu: 0 } : m));
    expect(timelinePaths(gappy).posLine.match(/M/g)).toHaveLength(2);
  });

  it("maps a pixel position to the nearest month, clamped", () => {
    expect(indexFromX(100, 800, 36)).toBe(4);
    expect(indexFromX(-50, 800, 36)).toBe(0);
    expect(indexFromX(900, 800, 36)).toBe(35);
    expect(indexFromX(100, 0, 36)).toBe(0);
    expect(indexFromX(100, 800, 1)).toBe(0);
  });

  it("turns two indices into an ordered month range", () => {
    expect(rangeFromIndices(monthly, 9, 3)).toEqual({ from: monthly[3].month, to: monthly[9].month });
  });

  it("describes the trend in words", () => {
    expect(timelineSummary(monthly)).toBe(
      "Positive share went from 70% in Nov 2023 to 70% in Oct 2026; negative share went from 20% to 20%.",
    );
  });
});
```

`web/src/components/charts/TimelineChart.test.tsx`:
```tsx
// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { MonthPoint } from "@/lib/data/schemas";
import { TimelineChart } from "./TimelineChart";

const monthly: MonthPoint[] = Array.from({ length: 36 }, (_, i) => {
  const d = new Date(Date.UTC(2023, 10 + i, 1));
  const month = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  return { month, count: 100, pos: 70, neg: 20, neu: 10, stars: null };
});

function setup() {
  const onRangeChange = vi.fn();
  render(<TimelineChart monthly={monthly} range={{ from: monthly[0].month, to: monthly[35].month }} onRangeChange={onRangeChange} />);
  const svg = screen.getByRole("img");
  // jsdom has no layout engine, so give the chart a real size.
  svg.getBoundingClientRect = () => ({ left: 0, top: 0, right: 800, bottom: 200, width: 800, height: 200, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
  return { svg, onRangeChange };
}

describe("TimelineChart", () => {
  it("describes the trend for screen readers", () => {
    const { svg } = setup();
    expect(svg.getAttribute("aria-label")).toContain("Positive share went from 70%");
  });

  it("selects the months you drag across", () => {
    const { svg, onRangeChange } = setup();
    fireEvent.mouseDown(svg, { clientX: 100 });
    fireEvent.mouseMove(svg, { clientX: 400 });
    fireEvent.mouseUp(window);
    expect(onRangeChange).toHaveBeenCalledWith({ from: monthly[4].month, to: monthly[18].month });
  });

  it("orders a right-to-left drag", () => {
    const { svg, onRangeChange } = setup();
    fireEvent.mouseDown(svg, { clientX: 400 });
    fireEvent.mouseMove(svg, { clientX: 100 });
    fireEvent.mouseUp(window);
    expect(onRangeChange).toHaveBeenCalledWith({ from: monthly[4].month, to: monthly[18].month });
  });

  it("ignores a click without a drag", () => {
    const { svg, onRangeChange } = setup();
    fireEvent.mouseDown(svg, { clientX: 300 });
    fireEvent.mouseUp(window);
    expect(onRangeChange).not.toHaveBeenCalled();
  });

  it("resets to all time on double-click", () => {
    const { svg, onRangeChange } = setup();
    fireEvent.doubleClick(svg);
    expect(onRangeChange).toHaveBeenCalledWith({ from: monthly[0].month, to: monthly[35].month });
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm exec vitest run src/components/charts`
Expected: FAIL with "Failed to resolve import ./timeline-geometry" and "./TimelineChart".

- [ ] **Step 3: Implement `web/src/components/charts/timeline-geometry.ts`**

```ts
import { scaleLinear } from "d3-scale";
import { area, line } from "d3-shape";
import type { MonthRange } from "@/lib/data/derive";
import type { MonthPoint } from "@/lib/data/schemas";
import { fmtMonth } from "@/lib/format";

// d3 does only the maths here (value → pixel, points → SVG path); React draws the SVG.

export const TL_WIDTH = 800;
export const TL_HEIGHT = 200;

export type TimelinePaths = {
  posLine: string;
  negLine: string;
  posArea: string;
  negArea: string;
  xAt: (i: number) => number;
};

const share = (p: MonthPoint, key: "pos" | "neg") => (p.count === 0 ? 0 : p[key] / p.count);
const hasReviews = (p: MonthPoint) => p.count > 0;

export function timelinePaths(monthly: MonthPoint[], width = TL_WIDTH, height = TL_HEIGHT): TimelinePaths {
  const x = scaleLinear().domain([0, Math.max(1, monthly.length - 1)]).range([0, width]);
  const y = scaleLinear().domain([0, 1]).range([height, height * 0.05]);
  const build = (key: "pos" | "neg") => {
    const ln = line<MonthPoint>().defined(hasReviews).x((_, i) => x(i)).y((p) => y(share(p, key)));
    const ar = area<MonthPoint>().defined(hasReviews).x((_, i) => x(i)).y0(height).y1((p) => y(share(p, key)));
    return { line: ln(monthly) ?? "", area: ar(monthly) ?? "" };
  };
  const pos = build("pos");
  const neg = build("neg");
  return { posLine: pos.line, negLine: neg.line, posArea: pos.area, negArea: neg.area, xAt: (i) => x(i) };
}

export function indexFromX(px: number, width: number, count: number): number {
  if (count <= 1 || width <= 0) return 0;
  const i = Math.round((px / width) * (count - 1));
  return Math.min(count - 1, Math.max(0, i));
}

export function rangeFromIndices(monthly: MonthPoint[], a: number, b: number): MonthRange {
  return { from: monthly[Math.min(a, b)].month, to: monthly[Math.max(a, b)].month };
}

export function timelineSummary(monthly: MonthPoint[]): string {
  const withReviews = monthly.filter(hasReviews);
  if (withReviews.length === 0) return "No reviews in this period.";
  const first = withReviews[0];
  const last = withReviews[withReviews.length - 1];
  const p = (pt: MonthPoint, key: "pos" | "neg") => Math.round(share(pt, key) * 100);
  return (
    `Positive share went from ${p(first, "pos")}% in ${fmtMonth(first.month)} to ${p(last, "pos")}% in ${fmtMonth(last.month)}; ` +
    `negative share went from ${p(first, "neg")}% to ${p(last, "neg")}%.`
  );
}
```

- [ ] **Step 4: Implement `web/src/components/charts/TimelineChart.tsx`**

```tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { fullRange, type MonthRange } from "@/lib/data/derive";
import type { MonthPoint } from "@/lib/data/schemas";
import { fmtInt, fmtMonth, fmtPct } from "@/lib/format";
import { TL_HEIGHT, TL_WIDTH, indexFromX, rangeFromIndices, timelinePaths, timelineSummary } from "./timeline-geometry";

type Props = { monthly: MonthPoint[]; range: MonthRange; onRangeChange: (range: MonthRange) => void };

export function TimelineChart({ monthly, range, onRangeChange }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const paths = useMemo(() => timelinePaths(monthly), [monthly]);
  const summary = useMemo(() => timelineSummary(monthly), [monthly]);
  const [hover, setHover] = useState<number | null>(null);
  const [drag, setDrag] = useState<{ start: number; end: number } | null>(null);

  const n = monthly.length;
  const indexAt = (clientX: number) => {
    const box = svgRef.current?.getBoundingClientRect();
    return box ? indexFromX(clientX - box.left, box.width, n) : 0;
  };

  // Finish a drag even if the mouse is released outside the chart.
  useEffect(() => {
    if (!drag) return;
    const finish = () => {
      setDrag(null);
      if (drag.start !== drag.end) onRangeChange(rangeFromIndices(monthly, drag.start, drag.end));
    };
    window.addEventListener("mouseup", finish);
    return () => window.removeEventListener("mouseup", finish);
  }, [drag, monthly, onRangeChange]);

  const indexOf = (month: string, fallback: number) => {
    const i = monthly.findIndex((m) => m.month === month);
    return i < 0 ? fallback : i;
  };
  const lo = drag ? Math.min(drag.start, drag.end) : indexOf(range.from, 0);
  const hi = drag ? Math.max(drag.start, drag.end) : indexOf(range.to, n - 1);
  const hovered = hover === null ? null : monthly[hover];
  const sharePct = (p: MonthPoint, key: "pos" | "neg") => (p.count ? (p[key] / p.count) * 100 : null);

  return (
    <figure className="relative m-0 select-none">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${TL_WIDTH} ${TL_HEIGHT}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={summary}
        className="block h-48 w-full cursor-crosshair"
        onMouseDown={(e) => {
          const i = indexAt(e.clientX);
          setDrag({ start: i, end: i });
        }}
        onMouseMove={(e) => {
          const i = indexAt(e.clientX);
          setHover(i);
          if (drag) setDrag({ start: drag.start, end: i });
        }}
        onMouseLeave={() => setHover(null)}
        onDoubleClick={() => onRangeChange(fullRange(monthly))}
      >
        <path d={paths.posArea} className="fill-pos/25" />
        <path d={paths.negArea} className="fill-neg/25" />
        <path d={paths.posLine} pathLength={1} className="animate-draw fill-none stroke-pos" strokeWidth={2} />
        <path d={paths.negLine} pathLength={1} className="animate-draw fill-none stroke-neg" strokeWidth={2} />
        <rect x={0} y={0} width={paths.xAt(lo)} height={TL_HEIGHT} className="fill-bg/70" />
        <rect x={paths.xAt(hi)} y={0} width={TL_WIDTH - paths.xAt(hi)} height={TL_HEIGHT} className="fill-bg/70" />
        {hover !== null && (
          <line x1={paths.xAt(hover)} x2={paths.xAt(hover)} y1={0} y2={TL_HEIGHT} className="stroke-muted" strokeDasharray="3 3" />
        )}
      </svg>

      {hovered && hover !== null && (
        <div
          aria-hidden
          className="pointer-events-none absolute top-2 z-10 border border-line bg-panel-2 px-2.5 py-1.5 text-xs"
          style={{ left: `min(calc(${(hover / Math.max(1, n - 1)) * 100}% + 12px), calc(100% - 10rem))` }}
        >
          <span className="label block">{fmtMonth(hovered.month)}</span>
          <span className="block font-mono">{fmtInt(hovered.count)} reviews</span>
          <span className="block font-mono text-pos">positive {fmtPct(sharePct(hovered, "pos"))}</span>
          <span className="block font-mono text-neg">negative {fmtPct(sharePct(hovered, "neg"))}</span>
        </div>
      )}

      <figcaption className="mt-1 flex justify-between font-mono text-[10.5px] text-muted">
        <span>{fmtMonth(monthly[0].month)}</span>
        <span>{fmtMonth(monthly[Math.floor((n - 1) / 2)].month)}</span>
        <span>{fmtMonth(monthly[n - 1].month)}</span>
      </figcaption>
    </figure>
  );
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm exec vitest run src/components/charts src/test`
Expected: PASS (geometry 5, TimelineChart 5, token guard green).

- [ ] **Step 6: Commit and mirror**

```bash
git add src/components/charts
git commit -m "feat(web): sentiment timeline with drag-to-select range and hover tooltip" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
Then run the mirror script.

---

### Task 7: Aspect bars, star donut and top complaints

**Files:**
- Create: `web/src/components/charts/AspectBars.tsx`, `web/src/components/charts/StarDonut.tsx`, `web/src/components/shop/TopComplaints.tsx`
- Test: `web/src/components/charts/AspectBars.test.tsx`, `web/src/components/charts/StarDonut.test.tsx`, `web/src/components/shop/TopComplaints.test.tsx`

**Interfaces:**
- Consumes:
  - `AspectRow`, `ComplaintItem` (Task 3).
  - `fmtSigned`, `fmtPct` (Task 3).
- Produces:
  - `<AspectBars rows={AspectRow[]} />`
  - `<StarDonut starMix={number[] | null} avgStars={number | null} />`
  - `<TopComplaints items={ComplaintItem[]} />`

- [ ] **Step 1: Write the failing tests**

`web/src/components/charts/AspectBars.test.tsx`:
```tsx
// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AspectBars } from "./AspectBars";

describe("AspectBars", () => {
  it("draws one row per aspect from the data, with a spoken summary", () => {
    render(
      <AspectBars
        rows={[
          { id: "fresh", name: "Freshness", mentions: 40, posPct: 35, negPct: 47 },
          { id: "price", name: "Price", mentions: 30, posPct: 72, negPct: 10 },
        ]}
      />,
    );
    expect(screen.getByText("Freshness: 35% positive, 47% negative, net \u221212")).toBeTruthy();
    expect(screen.getByText("Price: 72% positive, 10% negative, net +62")).toBeTruthy();
  });

  it("truncates a very long aspect name and keeps it as a tooltip", () => {
    const long = "Very long aspect name that keeps going well past the column width";
    render(<AspectBars rows={[{ id: "x", name: long, mentions: 3, posPct: 50, negPct: 50 }]} />);
    expect(screen.getByTitle(long).className).toContain("truncate");
  });

  it("explains an empty list", () => {
    render(<AspectBars rows={[]} />);
    expect(screen.getByText("No aspects mentioned in this range.")).toBeTruthy();
  });
});
```

`web/src/components/charts/StarDonut.test.tsx`:
```tsx
// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StarDonut } from "./StarDonut";

describe("StarDonut", () => {
  it("describes the rating mix for screen readers", () => {
    render(<StarDonut starMix={[1, 1, 2, 6, 10]} avgStars={4.15} />);
    const label = screen.getByRole("img").getAttribute("aria-label")!;
    expect(label).toContain("5 stars 50%");
    expect(label).toContain("1 star 5%");
    expect(label).toContain("Average 4.15");
  });

  it("says so when the data has no star ratings", () => {
    render(<StarDonut starMix={null} avgStars={null} />);
    expect(screen.getByText("No star ratings in this data.")).toBeTruthy();
  });
});
```

`web/src/components/shop/TopComplaints.test.tsx`:
```tsx
// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TopComplaints } from "./TopComplaints";

describe("TopComplaints", () => {
  it("lists complaints with their quotes as plain text", () => {
    const { container } = render(
      <TopComplaints items={[{ aspectId: "wait", name: "Wait time", negPct: 47.2, quote: "<b>Waited</b> an hour" }]} />,
    );
    expect(screen.getByText("Wait time")).toBeTruthy();
    expect(screen.getByText("47.2% negative")).toBeTruthy();
    expect(container.querySelector("b")).toBeNull();
    expect(screen.getByText("<b>Waited</b> an hour")).toBeTruthy();
  });

  it("explains when nothing stands out", () => {
    render(<TopComplaints items={[]} />);
    expect(screen.getByText("No clear complaints in this range.")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm exec vitest run src/components/charts/AspectBars.test.tsx src/components/charts/StarDonut.test.tsx src/components/shop/TopComplaints.test.tsx`
Expected: FAIL with "Failed to resolve import".

- [ ] **Step 3: Implement `web/src/components/charts/AspectBars.tsx`**

```tsx
import type { AspectRow } from "@/lib/data/derive";
import { fmtSigned } from "@/lib/format";

/** Diverging bars: negative grows left from the centre line, positive grows right. */
export function AspectBars({ rows }: { rows: AspectRow[] }) {
  if (rows.length === 0) return <p className="text-sm text-muted">No aspects mentioned in this range.</p>;
  return (
    <div>
      <ul className="m-0 grid list-none gap-2 p-0">
        {rows.map((r, i) => {
          const net = Math.round(r.posPct - r.negPct);
          const delay = { animationDelay: `${i * 50}ms` };
          return (
            <li key={r.id} className="grid grid-cols-[7.5rem_1fr_3rem] items-center gap-3 text-sm">
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

- [ ] **Step 4: Implement `web/src/components/charts/StarDonut.tsx`**

```tsx
import { arc, pie, type PieArcDatum } from "d3-shape";

const SLICE_COLOURS = [
  "var(--color-neg)",
  "color-mix(in srgb, var(--color-neg) 55%, var(--color-accent))",
  "var(--color-accent)",
  "color-mix(in srgb, var(--color-pos) 55%, var(--color-accent))",
  "var(--color-pos)",
];

type Props = { starMix: number[] | null; avgStars: number | null };

export function StarDonut({ starMix, avgStars }: Props) {
  const total = starMix?.reduce((a, b) => a + b, 0) ?? 0;
  if (!starMix || avgStars === null || total === 0) {
    return <p className="text-sm text-muted">No star ratings in this data.</p>;
  }
  const slices = pie<number>().sort(null).value((d) => d)(starMix);
  const shape = arc<PieArcDatum<number>>().innerRadius(52).outerRadius(80).padAngle(0.012);
  const label =
    "Star ratings: " +
    starMix.map((c, i) => `${i + 1} star${i ? "s" : ""} ${Math.round((c / total) * 100)}%`).join(", ") +
    `. Average ${avgStars.toFixed(2)}.`;

  return (
    <svg viewBox="-100 -100 200 200" className="h-44 w-44" role="img" aria-label={label}>
      {slices.map((s, i) => (
        <path key={i} d={shape(s) ?? ""} style={{ fill: SLICE_COLOURS[i] }} className="stroke-bg" strokeWidth={2} />
      ))}
      <text textAnchor="middle" y={6} fontSize={26} className="fill-ink font-serif">{avgStars.toFixed(1)}</text>
      <text textAnchor="middle" y={24} fontSize={10} className="fill-muted">avg stars</text>
    </svg>
  );
}
```

- [ ] **Step 5: Implement `web/src/components/shop/TopComplaints.tsx`**

```tsx
import type { ComplaintItem } from "@/lib/data/derive";
import { fmtPct } from "@/lib/format";

export function TopComplaints({ items }: { items: ComplaintItem[] }) {
  if (items.length === 0) return <p className="text-sm text-muted">No clear complaints in this range.</p>;
  return (
    <ol className="m-0 list-none p-0">
      {items.map((item) => (
        <li key={item.aspectId} className="border-t border-line py-2.5">
          <div className="flex items-baseline justify-between gap-3">
            <b className="font-medium">{item.name}</b>
            <span className="font-mono text-xs text-neg">{fmtPct(item.negPct)} negative</span>
          </div>
          {item.quote && <q className="mt-1 block font-serif text-sm text-muted">{item.quote}</q>}
        </li>
      ))}
    </ol>
  );
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm exec vitest run src/components src/test`
Expected: PASS (AspectBars 3, StarDonut 2, TopComplaints 2, plus everything earlier; the token guard confirms no hex values).

- [ ] **Step 7: Commit and mirror**

```bash
git add src/components
git commit -m "feat(web): aspect bars, star donut and top complaints" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
Then run the mirror script.

---

### Task 8: Shop shell: switcher, sidebar, demo bar, access helper

**Files:**
- Create:
  - `web/src/components/shop/shop-nav.ts`, `web/src/components/shop/ShopSwitcher.tsx`, `web/src/components/shop/Sidebar.tsx`, `web/src/components/shop/DemoBar.tsx`
  - `web/src/lib/data/load.ts`
  - `web/src/app/(app)/shops/[shopId]/layout.tsx`, `web/src/app/(app)/shops/[shopId]/not-found.tsx`, `web/src/app/(app)/shops/[shopId]/error.tsx`
- Modify: `web/next.config.ts`
- Test: `web/src/components/shop/ShopSwitcher.test.tsx`, `web/src/components/shop/Sidebar.test.tsx`, `web/src/components/shop/DemoBar.test.tsx`, `web/src/lib/data/load.test.ts`

**Interfaces:**
- Consumes:
  - `Shop` (Task 2).
  - `shopTypeLabel` (Task 3).
  - `data` (Task 4).
- Produces:
  - `SHOP_NAV: { slug: string; label: string; ownerOnly?: boolean }[]`
  - `visibleNav(isDemo: boolean)`
  - `<ShopSwitcher shops={Shop[]} currentId={string | null} />`
  - `<Sidebar shops={Shop[]} current={Shop | null} />`
  - `<DemoBar shop={Shop} />`
  - `requireShop(id: string): Promise<Shop>`, which calls `notFound()` for an unknown id.
  - The route segment `/shops/[shopId]/*`, with its layout, not-found page and error page.
  - A redirect from `/shops/:shopId` to `/shops/:shopId/overview`.

- [ ] **Step 1: Write the failing tests**

`web/src/lib/data/load.test.ts`:
```ts
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

import { requireShop } from "./load";

describe("requireShop", () => {
  it("returns a known shop", async () => {
    expect((await requireShop("freshcart")).name).toBe("FreshCart Grocery");
  });

  it("shows the not-found page for an unknown shop id", async () => {
    await expect(requireShop("no-such-shop")).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
```

`web/src/components/shop/ShopSwitcher.test.tsx`:
```tsx
// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { Shop } from "@/lib/data/schemas";
import { ShopSwitcher } from "./ShopSwitcher";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

const shop = (id: string, name: string, isDemo: boolean, type: Shop["type"] = "restaurant"): Shop => ({
  id, name, type, isDemo, reviewCount: 10, dateRange: { from: "2026-01", to: "2026-10" }, unreadAlerts: 0,
});
const shops = [shop("mine", "My Cafe", false), shop("fresh", "FreshCart Grocery", true, "grocery")];

describe("ShopSwitcher", () => {
  it("opens a grouped menu, marks the current shop and closes on Escape", () => {
    render(<ShopSwitcher shops={shops} currentId="fresh" />);
    const toggle = screen.getByRole("button", { name: /FreshCart Grocery/ });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("Your shops")).toBeTruthy();
    expect(screen.getByText("Demo shops")).toBeTruthy();
    expect(screen.getByRole("link", { name: /My Cafe/ }).getAttribute("href")).toBe("/shops/mine/overview");
    expect(screen.getByRole("link", { name: /FreshCart Grocery/ }).getAttribute("aria-current")).toBe("page");

    fireEvent.keyDown(document, { key: "Escape" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
  });

  it("hides 'Your shops' when there are no owned shops", () => {
    render(<ShopSwitcher shops={[shops[1]]} currentId="fresh" />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.queryByText("Your shops")).toBeNull();
  });
});
```

`web/src/components/shop/Sidebar.test.tsx`:
```tsx
// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { Shop } from "@/lib/data/schemas";
import { Sidebar } from "./Sidebar";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));
vi.mock("next/navigation", () => ({ usePathname: () => "/shops/fresh/overview" }));

const fresh: Shop = {
  id: "fresh", name: "FreshCart Grocery", type: "grocery", isDemo: true, reviewCount: 10,
  dateRange: { from: "2026-01", to: "2026-10" }, unreadAlerts: 0,
};

describe("Sidebar", () => {
  it("marks the current page in the shop navigation", () => {
    render(<Sidebar shops={[fresh]} current={fresh} />);
    const link = screen.getByRole("link", { name: "Overview" });
    expect(link.getAttribute("href")).toBe("/shops/fresh/overview");
    expect(link.getAttribute("aria-current")).toBe("page");
  });

  it("shows no shop navigation when the shop is unknown", () => {
    render(<Sidebar shops={[fresh]} current={null} />);
    expect(screen.queryByRole("navigation", { name: "Shop pages" })).toBeNull();
  });
});
```

`web/src/components/shop/DemoBar.test.tsx`:
```tsx
// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { Shop } from "@/lib/data/schemas";
import { DemoBar } from "./DemoBar";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

const base: Shop = {
  id: "s", name: "S", type: "grocery", isDemo: true, reviewCount: 1,
  dateRange: { from: "2026-01", to: "2026-10" }, unreadAlerts: 0,
};

describe("DemoBar", () => {
  it("tells visitors they are looking at a demo shop", () => {
    render(<DemoBar shop={base} />);
    expect(screen.getByRole("note").textContent).toContain("You're viewing a demo shop");
  });

  it("renders nothing for an owner's shop", () => {
    const { container } = render(<DemoBar shop={{ ...base, isDemo: false }} />);
    expect(container.innerHTML).toBe("");
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm exec vitest run src/lib/data/load.test.ts src/components/shop`
Expected: FAIL with "Failed to resolve import" for `./load`, `./ShopSwitcher`, `./Sidebar` and `./DemoBar`.

- [ ] **Step 3: Implement `web/src/lib/data/load.ts`**

```ts
import { notFound } from "next/navigation";
import { data } from "./index";
import type { Shop } from "./schemas";

/** Loads a shop or shows the segment's "Shop not found" page. Checkpoint 3 adds the owner check here. */
export async function requireShop(id: string): Promise<Shop> {
  const shop = await data.getShop(id);
  if (!shop) notFound();
  return shop;
}
```

- [ ] **Step 4: Implement the navigation list `web/src/components/shop/shop-nav.ts`**

```ts
export type ShopNavItem = { slug: string; label: string; ownerOnly?: boolean };

// Pages appear here as they are built: checkpoint 2 adds the analytics pages,
// checkpoint 3 the owner-only ones (with ownerOnly: true).
export const SHOP_NAV: ShopNavItem[] = [{ slug: "overview", label: "Overview" }];

export function visibleNav(isDemo: boolean): ShopNavItem[] {
  return SHOP_NAV.filter((item) => !(item.ownerOnly && isDemo));
}
```

- [ ] **Step 5: Implement `web/src/components/shop/ShopSwitcher.tsx`**

```tsx
"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Shop } from "@/lib/data/schemas";
import { shopTypeLabel } from "@/lib/format";

type Props = { shops: Shop[]; currentId: string | null };

export function ShopSwitcher({ shops, currentId }: Props) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const current = shops.find((s) => s.id === currentId) ?? null;
  const owned = shops.filter((s) => !s.isDemo);
  const demos = shops.filter((s) => s.isDemo);

  // Close on a click outside or on Escape.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const group = (label: string, list: Shop[]) => (
    <div className="py-1">
      <p className="label px-3 pt-1.5">{label}</p>
      <ul className="m-0 list-none p-0">
        {list.map((s) => (
          <li key={s.id}>
            <Link
              href={`/shops/${s.id}/overview`}
              aria-current={s.id === currentId ? "page" : undefined}
              onClick={() => setOpen(false)}
              className="block px-3 py-1.5 text-sm hover:bg-panel aria-[current=page]:shadow-[inset_2px_0_0_var(--color-accent)]"
            >
              <span className="block truncate">{s.name}</span>
              <span className="block text-xs text-muted">{shopTypeLabel(s.type)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="shop-menu"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 border border-line bg-panel px-3 py-2 text-left hover:border-accent"
      >
        <span className="min-w-0">
          <span className="block truncate text-sm">{current?.name ?? "Choose a shop"}</span>
          {current && (
            <span className="block text-xs text-muted">
              {shopTypeLabel(current.type)}
              {current.isDemo ? " · demo" : ""}
            </span>
          )}
        </span>
        <span aria-hidden className="text-muted">▾</span>
      </button>
      {open && (
        <div id="shop-menu" className="animate-fade-rise absolute inset-x-0 top-[calc(100%+4px)] z-20 border border-line bg-panel-2 shadow-lg">
          {owned.length > 0 && group("Your shops", owned)}
          {group("Demo shops", demos)}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Implement `web/src/components/shop/Sidebar.tsx`**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Shop } from "@/lib/data/schemas";
import { visibleNav } from "./shop-nav";
import { ShopSwitcher } from "./ShopSwitcher";

type Props = { shops: Shop[]; current: Shop | null };

export function Sidebar({ shops, current }: Props) {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-screen flex-col gap-1 border-r border-line bg-panel-2/60 px-3.5 py-4 md:flex">
      <Link href="/" className="font-serif text-lg">
        Review <span className="text-accent">Intelligence</span>
      </Link>
      <div className="my-4">
        <ShopSwitcher shops={shops} currentId={current?.id ?? null} />
      </div>
      {current && (
        <nav aria-label="Shop pages">
          <p className="label px-2.5 pb-1">Analyse</p>
          <ul className="m-0 list-none p-0">
            {visibleNav(current.isDemo).map((item) => {
              const href = `/shops/${current.id}/${item.slug}`;
              const active = pathname === href;
              return (
                <li key={item.slug}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className="block border-l-2 border-transparent px-2.5 py-1.5 text-sm text-muted transition-colors hover:text-ink aria-[current=page]:border-accent aria-[current=page]:bg-accent/10 aria-[current=page]:text-ink"
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </aside>
  );
}
```

- [ ] **Step 7: Implement `web/src/components/shop/DemoBar.tsx`**

```tsx
import Link from "next/link";
import type { Shop } from "@/lib/data/schemas";

/** Shown on public demo shops. Links home until /signup exists (checkpoint 3). */
export function DemoBar({ shop }: { shop: Shop }) {
  if (!shop.isDemo) return null;
  return (
    <div role="note" className="-mx-4 flex flex-wrap items-center justify-between gap-2 bg-accent px-4 py-2 text-sm text-bg md:-mx-8 md:px-8">
      <span>You&apos;re viewing a demo shop with public reviews.</span>
      <Link href="/" className="font-semibold underline-offset-2 hover:underline">
        Analyse your own reviews →
      </Link>
    </div>
  );
}
```

- [ ] **Step 8: Run the component and loader tests to verify they pass**

Run: `pnpm exec vitest run src/lib/data/load.test.ts src/components/shop`
Expected: PASS (requireShop 2, ShopSwitcher 2, Sidebar 2, DemoBar 2, plus Task 5's and Task 7's shop tests).

- [ ] **Step 9: Create the route segment files**

`web/src/app/(app)/shops/[shopId]/layout.tsx`:
```tsx
import { Suspense } from "react";
import { DemoBar } from "@/components/shop/DemoBar";
import { Sidebar } from "@/components/shop/Sidebar";
import { data } from "@/lib/data";

// Params are request data under cacheComponents, so they're read inside Suspense
// boundaries. The rest of the shell stays in the static, instantly loading part.
export default function ShopLayout({ children, params }: LayoutProps<"/shops/[shopId]">) {
  return (
    <div className="grid min-h-screen md:grid-cols-[15rem_1fr]">
      <Suspense fallback={<aside aria-hidden className="hidden border-r border-line md:block" />}>
        <ShopSidebar params={params} />
      </Suspense>
      <main id="main" className="min-w-0 px-4 pb-24 md:px-8">
        <Suspense fallback={null}>
          <ShopDemoBar params={params} />
        </Suspense>
        {children}
      </main>
    </div>
  );
}

async function ShopSidebar({ params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = await params;
  const [shops, current] = await Promise.all([data.listShops(), data.getShop(shopId)]);
  return <Sidebar shops={shops} current={current} />;
}

async function ShopDemoBar({ params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = await params;
  const shop = await data.getShop(shopId);
  return shop ? <DemoBar shop={shop} /> : null;
}
```

`web/src/app/(app)/shops/[shopId]/not-found.tsx`:
```tsx
import Link from "next/link";

export default function ShopNotFound() {
  return (
    <div className="py-24">
      <h1 className="font-serif text-3xl">Shop not found</h1>
      <p className="mt-2 text-muted">This shop doesn&apos;t exist, or you don&apos;t have access to it.</p>
      <Link href="/" className="mt-6 inline-block border border-line px-3 py-1.5 text-sm hover:border-accent">
        Back to start
      </Link>
    </div>
  );
}
```

`web/src/app/(app)/shops/[shopId]/error.tsx`:
```tsx
"use client";

import { useEffect } from "react";

// Next.js 16 passes `retry` (not `reset`) to error boundaries.
export default function ShopError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div role="alert" className="py-24">
      <h1 className="font-serif text-2xl">Couldn&apos;t load this page</h1>
      <p className="mt-2 text-muted">Something went wrong while loading the shop data.</p>
      <button type="button" onClick={() => retry()} className="mt-6 border border-accent px-3 py-1.5 text-sm text-accent hover:bg-accent hover:text-bg">
        Retry
      </button>
    </div>
  );
}
```

- [ ] **Step 10: Add the redirect in `web/next.config.ts`**

Add this method inside the `nextConfig` object, after `partialPrefetching: true,`:
```ts
  // /shops/<id> has no page of its own; send visitors to the overview.
  async redirects() {
    return [{ source: "/shops/:shopId", destination: "/shops/:shopId/overview", permanent: false }];
  },
```

- [ ] **Step 11: Type-check (the route types come from `next typegen`)**

Run: `pnpm typecheck`
Expected: exit 0. If `LayoutProps<"/shops/[shopId]">` is unknown, it means typegen didn't see the route. Check the folder path is exactly `src/app/(app)/shops/[shopId]/`.

- [ ] **Step 12: Commit and mirror**

```bash
git add src/components/shop src/lib/data/load.ts src/lib/data/load.test.ts "src/app/(app)" next.config.ts
git commit -m "feat(web): shop shell with switcher, sidebar, demo bar and not-found/error pages" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
Then run the mirror script.

---

### Task 9: Overview page

**Files:**
- Create: `web/src/components/shop/OverviewView.tsx`, `web/src/components/shop/OverviewSkeleton.tsx`, `web/src/app/(app)/shops/[shopId]/overview/page.tsx`
- Test: `web/src/components/shop/OverviewView.test.tsx`

**Interfaces:**
- Consumes:
  - From Task 3: `aspectRows`, `fullRange`, `lastMonths`, `rangeHeadline`, `sameRange`, `sliceMonths`, `summarize`, `topComplaints`, `MonthRange`.
  - Components: `Headline`, `KpiRow` (Task 5); `TimelineChart` (Task 6); `AspectBars`, `StarDonut`, `TopComplaints` (Task 7).
  - `requireShop` (Task 8) and `data` (Task 4).
- Produces:
  - `<OverviewView shop={Shop} overview={Overview} aspects={Aspect[]} reviews={Review[]} />`
  - `<OverviewSkeleton />`
  - The route `/shops/[shopId]/overview`.

- [ ] **Step 1: Write the failing test** (`web/src/components/shop/OverviewView.test.tsx`)

```tsx
// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { buildDb } from "@/lib/data/mock/build";
import { SHOP_DEFS } from "@/lib/data/mock/shops";
import type { Overview } from "@/lib/data/schemas";
import { fmtInt } from "@/lib/format";
import { OverviewView } from "./OverviewView";

const fresh = buildDb(SHOP_DEFS).get("freshcart")!;

function renderFresh(overview: Overview = fresh.overview) {
  render(<OverviewView shop={fresh.shop} overview={overview} aspects={fresh.aspects} reviews={fresh.reviews} />);
}

describe("OverviewView", () => {
  it("shows the shop's own headline and its discovered aspects", () => {
    renderFresh();
    expect(screen.getByRole("heading", { level: 1, name: "FreshCart Grocery" })).toBeTruthy();
    expect(screen.getByText("produce freshness")).toBeTruthy();
    expect(screen.getAllByText("Freshness").length).toBeGreaterThan(0);
  });

  it("recalculates the headline and numbers for a preset range", async () => {
    renderFresh();
    fireEvent.click(screen.getByRole("button", { name: "Last 6 months" }));
    expect(screen.getByText(/^From /)).toBeTruthy();
    const last6 = fresh.overview.monthly.slice(-6).reduce((sum, p) => sum + p.count, 0);
    await waitFor(() => expect(screen.getByText(fmtInt(last6))).toBeTruthy());
    expect(screen.getByRole("button", { name: "Last 6 months" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("shows an empty state, not NaN, when the range has no reviews", () => {
    const zeroed: Overview = {
      ...fresh.overview,
      monthly: fresh.overview.monthly.map((p, i, all) =>
        i >= all.length - 6 ? { ...p, count: 0, pos: 0, neg: 0, neu: 0, stars: [0, 0, 0, 0, 0] } : p,
      ),
    };
    renderFresh(zeroed);
    fireEvent.click(screen.getByRole("button", { name: "Last 6 months" }));
    expect(screen.getByText(/^No reviews between/)).toBeTruthy();
    expect(screen.queryByText(/NaN/)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Show all time" }));
    expect(screen.getByText("produce freshness")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm exec vitest run src/components/shop/OverviewView.test.tsx`
Expected: FAIL with "Failed to resolve import ./OverviewView".

- [ ] **Step 3: Implement `web/src/components/shop/OverviewView.tsx`**

```tsx
"use client";

import { useMemo, useState } from "react";
import { AspectBars } from "@/components/charts/AspectBars";
import { StarDonut } from "@/components/charts/StarDonut";
import { TimelineChart } from "@/components/charts/TimelineChart";
import {
  aspectRows, fullRange, lastMonths, rangeHeadline, sameRange, sliceMonths, summarize, topComplaints,
  type MonthRange,
} from "@/lib/data/derive";
import type { Aspect, Overview, Review, Shop } from "@/lib/data/schemas";
import { fmtInt, fmtMonth, shopTypeLabel } from "@/lib/format";
import { Headline } from "./Headline";
import { KpiRow } from "./KpiRow";
import { TopComplaints } from "./TopComplaints";

type Props = { shop: Shop; overview: Overview; aspects: Aspect[]; reviews: Review[] };

export function OverviewView({ shop, overview, aspects, reviews }: Props) {
  const { monthly } = overview;
  const all = useMemo(() => fullRange(monthly), [monthly]);
  const [range, setRange] = useState<MonthRange>(all);
  const isAll = sameRange(range, all);

  const presets = useMemo(
    () => [
      { label: "All time", range: all },
      { label: "Last 12 months", range: lastMonths(monthly, 12) },
      { label: "Last 6 months", range: lastMonths(monthly, 6) },
    ],
    [all, monthly],
  );

  const baseline = useMemo(() => summarize(monthly), [monthly]);
  const summary = useMemo(() => summarize(sliceMonths(monthly, range)), [monthly, range]);
  const rows = useMemo(() => aspectRows(aspects, range), [aspects, range]);
  const complaints = useMemo(() => topComplaints(rows, reviews, range), [rows, reviews, range]);
  const headline = isAll ? overview.headline : rangeHeadline(range, summary, complaints[0]?.name ?? null);
  const empty = summary.reviews === 0;

  return (
    <div className="animate-fade-rise">
      <header className="border-b border-line pb-4 pt-6">
        <p className="label">
          {shopTypeLabel(shop.type)} · {fmtInt(shop.reviewCount)} reviews · {fmtMonth(all.from)} – {fmtMonth(all.to)}
        </p>
        <h1 className="mt-1 font-serif text-3xl">{shop.name}</h1>
      </header>

      <Headline headline={headline} className="mt-5 max-w-3xl" />

      <KpiRow summary={summary} baseline={isAll ? undefined : baseline} />

      <div className="mt-6 flex flex-wrap items-center gap-2" role="group" aria-label="Time range">
        {presets.map((p) => (
          <button
            key={p.label}
            type="button"
            aria-pressed={sameRange(range, p.range)}
            onClick={() => setRange(p.range)}
            className="border border-line bg-panel px-3 py-1 text-sm transition-colors hover:border-accent aria-pressed:border-accent aria-pressed:bg-accent aria-pressed:text-bg"
          >
            {p.label}
          </button>
        ))}
        <span className="ml-2 font-mono text-xs text-muted">
          {fmtMonth(range.from)} → {fmtMonth(range.to)}
        </span>
      </div>

      <section className="mt-3" aria-label="Sentiment over time">
        <p className="label mb-1">Sentiment over time · drag across the chart to pick a range, double-click to reset</p>
        <TimelineChart monthly={monthly} range={range} onRangeChange={setRange} />
      </section>

      {empty ? (
        <div className="mt-8 border border-dashed border-line p-6 text-center">
          <p>Nothing to show for this range.</p>
          <button
            type="button"
            onClick={() => setRange(all)}
            className="mt-3 border border-accent px-3 py-1 text-sm text-accent hover:bg-accent hover:text-bg"
          >
            Show all time
          </button>
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1.3fr_1fr]">
          <section aria-labelledby="aspects-heading">
            <h2 id="aspects-heading" className="label mb-3">What customers rate this shop on · net score</h2>
            <AspectBars rows={rows} />
            <p className="mt-3 border-l-2 border-info pl-2 text-xs text-muted">
              These aspects were discovered from the reviews, not picked from a list.
            </p>
          </section>
          <div className="grid content-start gap-8">
            <section aria-labelledby="stars-heading">
              <h2 id="stars-heading" className="label mb-3">Star rating mix</h2>
              <StarDonut starMix={summary.starMix} avgStars={summary.avgStars} />
            </section>
            <section aria-labelledby="complaints-heading">
              <h2 id="complaints-heading" className="label mb-3">Top complaints</h2>
              <TopComplaints items={complaints} />
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Implement `web/src/components/shop/OverviewSkeleton.tsx`**

```tsx
/** Same layout as the overview, as shimmering placeholders, so nothing jumps when data arrives. */
export function OverviewSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading overview" className="pt-6">
      <div className="skeleton h-3 w-56" />
      <div className="skeleton mt-3 h-8 w-80" />
      <div className="skeleton mt-6 h-7 w-full max-w-3xl" />
      <div className="mt-5 grid grid-cols-2 gap-px md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-20" />
        ))}
      </div>
      <div className="skeleton mt-8 h-48 w-full" />
    </div>
  );
}
```

- [ ] **Step 5: Create the route `web/src/app/(app)/shops/[shopId]/overview/page.tsx`**

```tsx
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { OverviewSkeleton } from "@/components/shop/OverviewSkeleton";
import { OverviewView } from "@/components/shop/OverviewView";
import { data } from "@/lib/data";
import { requireShop } from "@/lib/data/load";

export default function OverviewPage({ params }: PageProps<"/shops/[shopId]/overview">) {
  return (
    <Suspense fallback={<OverviewSkeleton />}>
      <OverviewLoader params={params} />
    </Suspense>
  );
}

async function OverviewLoader({ params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = await params;
  const shop = await requireShop(shopId);
  const [overview, aspects] = await Promise.all([data.getOverview(shopId), data.getAspects(shopId)]);
  if (!overview || !aspects) notFound();
  const reviews = await data.getReviewsByIds(shopId, aspects.flatMap((a) => a.exampleReviewIds));
  return <OverviewView shop={shop} overview={overview} aspects={aspects} reviews={reviews} />;
}
```

- [ ] **Step 6: Run the test and the type check**

Run: `pnpm exec vitest run src/components/shop/OverviewView.test.tsx && pnpm typecheck`
Expected: PASS (3 tests) and typecheck exits 0.

- [ ] **Step 7: Commit and mirror**

```bash
git add src/components/shop/OverviewView.tsx src/components/shop/OverviewView.test.tsx src/components/shop/OverviewSkeleton.tsx "src/app/(app)/shops/[shopId]/overview"
git commit -m "feat(web): interactive overview page with range presets and empty state" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
Then run the mirror script.

---

### Task 10: Start page, full verification and checkpoint docs

**Files:**
- Rewrite: `web/src/app/page.tsx`
- Modify: `README.md` (repo root); `ERROR_LOG.md` only if incidents happened

**Interfaces:**
- Consumes: `data.listShops` (Task 4), `shopTypeLabel` (Task 3).
- Produces: a temporary `/` start page that links to every shop. Checkpoint 4 replaces it with the landing page.

- [ ] **Step 1: Rewrite `web/src/app/page.tsx`**

```tsx
import Link from "next/link";
import { data } from "@/lib/data";
import { shopTypeLabel } from "@/lib/format";

// Temporary start page; the real landing page arrives in checkpoint 4.
export default async function Home() {
  const shops = await data.listShops();
  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <p className="label text-accent">Review Intelligence · preview build</p>
      <h1 className="mt-3 font-serif text-4xl leading-tight">Find out what your customers actually complain about.</h1>
      <p className="mt-4 text-muted">Pick a shop to open its overview.</p>
      <ul className="mt-8 grid list-none gap-3 p-0 sm:grid-cols-2">
        {shops.map((s) => (
          <li key={s.id}>
            <Link href={`/shops/${s.id}/overview`} className="block border border-line bg-panel p-4 transition-colors hover:border-accent">
              <span className="label">
                {shopTypeLabel(s.type)}
                {s.isDemo ? " · demo" : " · your shop"}
              </span>
              <span className="mt-1 block font-serif text-xl">{s.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
```

- [ ] **Step 2: Run every check, the same as CI**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected:
- lint: no errors
- typecheck: exit 0
- tests: all pass (expect about 70 tests, 0 failed)
- build: `✓ Compiled successfully`, with the `/shops/[shopId]/overview` route listed

If the build reports "Uncached data was accessed outside of `<Suspense>`", a `params` read has escaped a Suspense boundary. Fix it per the Global Constraints. Do not disable `cacheComponents`.

- [ ] **Step 3: Manual walkthrough in the browser**

Run `pnpm dev`, then open `http://localhost:3000` in Chrome and check:
1. The start page lists 5 shops in Tropical colours, with the serif headline.
2. `/shops/freshcart` redirects to `/shops/freshcart/overview`.
3. The overview shows the headline, 4 KPI cells, the timeline drawing in, aspect bars growing, the donut and top complaints.
4. Hovering the chart shows a guide line and a tooltip. Dragging selects a range; the headline, numbers (counting) and aspects update. Double-click resets.
5. The presets work, and one is shown as pressed.
6. The shop switcher opens, groups the shops, closes on Esc, and navigates. VoltHome shows *Installation* and *Warranty*, not grocery aspects.
7. The demo bar appears on demo shops only.
8. `/shops/nope/overview` shows "Shop not found".
9. With the OS "reduce motion" setting on, nothing animates.

Take screenshots of the overview for the user.

- [ ] **Step 4: Update the README status and frontend notes**

In `README.md`, replace the status line with:
```markdown
> **Status:** 🚧 Part 1 (frontend with mock data): **checkpoint 1 done**. Tropical design system, data contract, shop shell and an interactive Overview page. See [the spec](docs/superpowers/specs/2026-10-30-frontend-mock-design.md).
```
Then add this section after "Run all checks (same as CI)":
```markdown
## Frontend preview (mock data)

`cd web && pnpm dev`, then open http://localhost:3000. Every screen currently runs on seeded mock data from
`web/src/lib/data/mock/`. Pages only use the `DataSource` interface in `web/src/lib/data/index.ts`, so later
parts swap in the real backend by changing one line.
```

- [ ] **Step 5: Log any incidents**

For each error hit during Tasks 1–10, add an `ERROR_LOG.md` entry in the existing format: date, milestone "Part 1 checkpoint 1", error, root cause, fix, files changed, verified by, attempts. If there were none, skip this step.

- [ ] **Step 6: Commit and mirror**

```bash
git add web/src/app/page.tsx README.md ERROR_LOG.md
git commit -m "feat(web): temporary start page; docs for checkpoint 1" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
(Run from the repo root, `C:\dev\review-intel`.) Then run the mirror script.

- [ ] **Step 7: STOP for the checkpoint review**

Summarise for the user:
- what was built
- how to run it (`cd web && pnpm dev`)
- how to verify it (`pnpm test`, and the walkthrough list above)
- the screenshots
- any incidents

Then wait for their go-ahead before Checkpoint 2.
