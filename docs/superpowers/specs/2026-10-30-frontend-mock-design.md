# Part 1 design: frontend with mock data

**Date:** 2026-10-30 · **Status:** awaiting review · **Owner:** project author (reviewer), Claude (implementer)

## 1. Context and goal

The project's scope widened on 2026-10-30. It is no longer about one Amazon phone category. It is a **review-intelligence SaaS for any shop type** (restaurants, groceries, electrical appliances and others). The things a shop is rated on (its *aspects*) are discovered from the reviews automatically, not taken from a hand-written list.

The work is split into 7 parts, built in order:

1. **Frontend with mock data** ← this spec
2. ML core: multi-domain sentiment and automatic aspect discovery
3. Multi-shop database with row-level security
4. CSV upload and background processing
5. SaaS layer (real auth, alerts by email, report links)
6. Per-shop chat (RAG)
7. Polish and deploy

**Goal of Part 1:** build every screen of the product in `web/` against a typed **data contract**, using deterministic mock data. Later parts replace the mock data source without changing the screens.

**Why first:** the user asked to see the product early, and the screens fix exactly what data the backend must produce.

## 2. Scope

**In scope**
- Public pages: landing, how it works, login and signup (mock), shared report.
- Owner area: my shops, add shop, compare shops, settings.
- Shop pages, used by demo and owner shops alike: overview, topics, aspects, reviews, ask, try it.
- Owner-only shop pages: uploads (wizard + history), alerts, share.
- Mock data for 3 demo shops (Saffron Table, a restaurant; FreshCart, a grocery; VoltHome, an appliance store) and 2 owner shops (Spice Route Indiranagar and Koramangala).
- Simulated upload processing, chat streaming and live prediction.
- **Review sources (added 2026-10-31):** a mock "Connect Google Business Profile" flow that auto-imports an owner's reviews, and a public "search any shop" preview of a shop's few public Google reviews. Both are simulated here; the real Google APIs come in later parts.

**Out of scope (later parts)**
- Real auth.
- Database.
- File parsing on the server.
- Real models and LLM.
- Sending email.
- Real Google OAuth and Google API calls (Business Profile and Places).
- Team members and billing. These are deferred beyond v1.

## 3. Decisions

| Decision | Choice | Reason |
|---|---|---|
| Visual style | "Analyst workbench": dark, left sidebar, serif headline that states the finding, monospace numbers | Chosen from mockups. Must not look AI-generated: no purple gradients, glow cards, sparkle icons or vague labels |
| Palette | **Tropical**: bg `#05252a`, panel `#0a3238`, line `#16505a`, text `#effcfa`, muted `#8fbfbd`, positive `#22e39b`, negative `#ff5a36`, neutral/accent `#ffcf33`, info `#3ad0ff` | Chosen by the user. The shared report uses a light variant of the same palette for printing |
| Charts | Custom SVG + `d3-scale`, `d3-shape`, `d3-force` (math only) | Full control (drag-to-filter, annotations, bubbles); avoids a templated look; teaches how charts work |
| Animation | `motion` (Motion for React) + CSS | Standard library; handles enter, exit and layout (sliding rows) |
| UI controls | shadcn/ui components copied into `components/ui`, restyled | We own the source; no heavy UI dependency |
| Validation | zod schemas define the contract | One definition gives both TypeScript types and runtime checks |
| Tests | vitest (existing) + React Testing Library + jsdom | Approved by the user; Playwright is deferred to Part 7 |
| Reference mockups | `.superpowers/brainstorm/*/content/interactive-v3.html` and `saas-screens-tropical.html` (local, gitignored) | Visual source of truth for this part |

## 4. Screen map

```
PUBLIC
  /                      Landing: hero, 3 demo shop cards, how-it-works steps, sign up
  /how-it-works          Models, metrics, limitations (placeholder numbers until Parts 2–6)
  /search                Search any shop by name → preview analysis of its ~5 public Google reviews, labelled "preview", with a sign-up prompt
  /login  /signup        Mock auth: any credentials create a session cookie
  /r/[token]             Shared report: read-only, light theme, print/PDF friendly

OWNER AREA (login required)
  /app                   My shops: cards with headline stats, alert badge, sparkline, "Add shop"
  /app/shops/new         Name + type (restaurant / grocery / electronics / clothing / salon / other), then pick a source: Connect Google or Upload CSV
  /app/compare           Two shops side by side per aspect, gaps highlighted
  /app/settings          Account name and alert email

SHOP PAGES  /shops/[shopId]/…   demo: public · owner shop: owner only
  overview               Headline, KPIs, drag-to-filter timeline, aspect bars, star donut, top complaints
  topics                 Bubble map (size = reviews, colour = negativity), filter, detail panel
  aspects                Aspect bars with net score, drill-down drawer with highlighted sentences
  reviews                Filters (sentiment, stars, aspect), sort, search, animated reordering
  ask                    Suggested questions, streamed answer, citation chips linked to sources
  try                    Live as-you-type analysis: highlighted words, gauge, aspect tags
  sources   (owner)      Google Business Profile: connect (mock consent) → pick location → first import; status, last sync, "Sync now", disconnect
  uploads   (owner)      History table + wizard: file → column mapping → preview → processing → what changed
  alerts    (owner)      Rules with toggles and thresholds, add rule, recent-alert timeline
  share     (owner)      Create a link (period, sections), copy, revoke, open
```

The sidebar has a shop switcher (your shops plus the demo shops), then the analytics links, then the owner-only links, then My shops and Compare. Demo shops show a top bar: "You're viewing a demo shop · Analyse your own reviews →". The Ctrl+K command palette jumps to pages, shops, topics and filters.

Nothing in the UI assumes a shop type. Aspect names, counts and examples always come from data.

## 5. Data contract (`web/src/lib/data/schemas.ts`)

```ts
Shop        { id, name, type, isDemo, reviewCount, dateRange{from,to}, lastUploadAt?, unreadAlerts }
Headline    { parts: { text: string; tone?: "positive" | "negative" | "neutral" }[] }
Kpis        { reviews, positivePct, negativePct, avgStars | null, delta?: {...same keys} }
MonthPoint  { month: "YYYY-MM", count, pos, neg, neu }
Overview    { shopId, headline, kpis, monthly: MonthPoint[], starMix: number[5] | null, topComplaints: {aspectId, negPct, quoteReviewId}[] }
Aspect      { id, name, group?, mentions, posPct, negPct, neuPct, monthly: MonthPoint[], isNew?, exampleReviewIds }
Topic       { id, label, keywords[], size, negShare, monthly: MonthPoint[], representativeReviewIds[] }
Review      { id, date, stars | null, text, sentiment, confidence, helpful?, aspectMentions: {aspectId, start, end, sentiment}[] }
Page<T>     { items: T[], nextCursor | null, total }
Upload      { id, shopId, fileName, createdAt, status: "processing"|"done"|"failed", rowsAccepted,
              rowsSkipped{empty,duplicate,invalid}, stages: {name, status, seconds?}[], changes: Change[], error? }
Source      { id, shopId, kind: "google"|"csv", status: "connected"|"syncing"|"error"|"disconnected", accountLabel?, locationName?, lastSyncAt?, reviewsImported, error? }
PlacePreview { query, place: { name, address, rating, totalRatings } | null, reviews: Review[], summary: { positivePct, negativePct, aspects: {name, sentiment}[] }, isPreview: true }
Change      { kind: "rise"|"fall"|"new_aspect", aspectId, deltaPct?, note }
ColumnGuess { column, role: "text"|"stars"|"date"|"ignore", samples[] }
AlertRule   { id, shopId, kind: "aspect_rise"|"rating_below"|"new_aspect"|"digest", params, enabled }
AlertEvent  { id, shopId, ruleId, createdAt, title, detail, tone }
ShareLink   { token, shopId, period, sections[], createdAt, views, revokedAt | null }
Report      { shop, period, headline, kpis, aspects, quotes: Review[] }
ChatChunk   { type: "text", text } | { type: "citation", reviewId } | { type: "done" } | { type: "error", message }
Prediction  { sentiment, score (-1..1), confidence, tokens: {text, tone?, aspectId?}[], aspects: {name, sentiment}[] }
Comparison  { shops: Shop[], rows: { group, name, net: number[] }[] }
```

**Data layer:** `web/src/lib/data/index.ts` exports a `DataSource` interface. Its methods are listShops, getShop, getOverview, getAspects, getTopics, getReviews, ask (async iterable), predict, listUploads, guessColumns, startUpload, getUpload, listAlertRules, saveAlertRule, listAlertEvents, listShareLinks, createShareLink, revokeShareLink, getReport, compare, listSources, connectGoogle, syncSource, disconnectSource and searchPlaces. Today a single `data` export points at the mock implementation; later parts swap in the real one.

**Rules**
- **The headline is structured parts, never HTML.** Owners will upload review text, and rendering HTML from data would open an XSS hole.
- **Mock data is generated from a fixed seed.** The same output every run keeps tests and screenshots stable.
- **The mock source validates its own output with the zod schemas in tests.** That proves the contract is followed.
- **Time ranges are applied in the data layer.** For example, `getOverview(id, {from, to})` recomputes KPIs from the monthly points, so pages never do statistics.

## 6. Components and structure (`web/src/`)

```
app/(public)/…  app/(app)/…  app/shops/[shopId]/layout.tsx (access check + demo bar)
components/charts/   TimelineChart, AspectBars, StarDonut, TopicBubbles, Sparkline, CompareBars, SentimentGauge
components/shop/     Sidebar, ShopSwitcher, DemoBar, Headline, KpiRow, ReviewCard, AspectDrawer, ReviewList
components/upload/   UploadWizard, FileDrop, ColumnMapper, PreviewTable, ProcessingStages, ChangeCards
components/alerts/   RuleRow, AlertFeed
components/share/    ShareForm, LinkList
components/chat/     ChatPanel, CitationChip, SourceList
components/try/      LiveAnalyzer
components/ui/       shadcn: Button, Input, Select, Dialog, Switch, Toast, CommandPalette
components/motion/   presets + useReducedMotion wrapper
lib/data/            schemas.ts, index.ts, mock/
lib/auth/session.ts  mock session cookie (replaced by Supabase Auth in Part 5)
lib/format.ts        numbers, percents, dates
styles in app/globals.css   Tropical tokens + light report tokens
```

**Principles**
- Server components load data and client components handle interaction.
- One job per component.
- Charts take plain data and emit events ("data down, events up").
- Colours come only from CSS tokens.
- The access rule lives in one layout.

**Access rule (mock):**
- A demo shop is visible to anyone.
- An owner shop needs a session cookie whose user owns it.
- Otherwise, a logged-out visitor goes to `/login?next=…`, and a logged-in non-owner sees "Shop not found". That page never confirms the shop exists.

Next.js 16 conventions must be checked in `web/node_modules/next/dist/docs/` before writing code, as `web/AGENTS.md` requires.

## 7. Interaction, states and accessibility

**Animations**
- Every animation explains something (data arriving, what changed, where data came from, progress).
- Each is ≤ 0.7 s.
- All are disabled under `prefers-reduced-motion`.
- The set: count-up, line draw, bar grow, drawer slide, bubble settle, list reorder, streamed text and citation pop, gauge swing, processing ticks.

**Four states for every data area**
- **Loading:** skeletons that match the layout. Uses `loading.tsx` and `<Suspense>` per chart.
- **Empty:** helpful copy and an action. A new shop gets "Upload your first CSV"; an empty range gets "Try All time".
- **Error:** what failed and a Retry button. `error.tsx` per section, so one failure doesn't break the page.
- **Ready.**

**Special cases**
- **Model waking up:** a "waking the model…" message for Ask and Try it.
- **Upload validation:** wrong type, no text column, too many rows (limit 5,000) or a failed stage each get a specific message.
- **Revoked report:** "This report link is no longer active".
- **Someone else's shop:** "Shop not found".

**Accessibility**
- Everything is keyboard operable (Esc closes, arrows in the palette), and the timeline has preset buttons as a non-drag alternative.
- Each chart has a text summary for screen readers.
- Toggles use `role="switch"` and `aria-checked`.
- Text meets WCAG AA contrast.
- Sentiment is never shown by colour alone; −/+ signs and position are used too.
- On mobile the sidebar collapses to a menu button and charts are responsive.

## 8. Testing

1. **Contract:** every mock method's output parses with its zod schema.
2. **Logic:** range filtering and KPI maths, the brush's pixel→month mapping, formatters, mock change detection, Headline rendering escapes text.
3. **Components (RTL + jsdom):**
   - AspectBars renders data-driven aspects for different shop types.
   - UploadWizard blocks "Next" without a text column and walks through all stages.
   - LinkList revoke disables Copy.
   - RuleRow toggle changes aria-checked.
   - ChatPanel renders citations from chunks.
4. **Access:**
   - A logged-out user on an owner shop is redirected.
   - A non-owner sees not-found.
   - A demo shop hides the owner links.
5. **Build:** `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, in CI.
6. **Manual:** a Chrome walkthrough of every screen with screenshots for the user.

Tests check behaviour, not implementation details.

## 9. Build order and checkpoints

There is a stop for the user's approval after each checkpoint.

1. **Foundation + Overview:** install deps, tokens and fonts, data contract and mocks, app shell (sidebar, switcher, demo bar), the Overview page with the timeline, aspect bars and donut.
2. **Analytics pages:** Topics, Aspects (drawer), Reviews, Ask, Try it, Ctrl+K palette.
3. **Owner area:** mock auth, My shops, Add shop, Sources (Connect Google), Uploads wizard, Alerts, Share, Report, Compare, Settings.
4. **Public + polish:** Landing, How it works, Search teaser, empty/error states everywhere, accessibility pass, mobile layout, README screenshots.

## 10. Definition of done

- Every screen in §4 exists in `web/` and works with mock data.
- Lint, typecheck, tests and build pass locally and in GitHub Actions.
- Every data area has loading, empty and error states.
- Keyboard operable, reduced motion respected, usable at 375 px wide.
- No hard-coded colours. No phone-specific wording. Aspects come from data.
- README updated with screenshots. ERROR_LOG updated with any incidents. Small descriptive commits. OneDrive mirror refreshed.

## 11. Follow-ups outside this spec

- **PLAN.md, RISKS.md and the README need updating for the new scope.** That means multi-domain data (Yelp + Amazon grocery/appliances), automatic aspect discovery, multi-tenant DB, upload jobs and SaaS features. It will be done as a separate docs change before Part 2 starts.
- **Google APIs (added 2026-10-31):** Business Profile API access needs Google's approval, and Places API review limits and storage/display rules must be checked against current docs before the real integration. Scraping Amazon, Yelp or Google is ruled out (terms of service).
- **The Yelp Open Dataset licence (academic, non-commercial) needs checking** before Part 2 uses it.
