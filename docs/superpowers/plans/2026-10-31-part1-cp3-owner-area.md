# Part 1 · Checkpoint 3: Owner Area Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add everything an owner sees in `web/`, all running on deterministic mock data through the `DataSource` contract:
- mock login and signup
- My shops, Add shop and Settings
- per-shop Sources (Connect Google Business Profile), Uploads (CSV wizard + history), Alerts and Share
- the public shared Report and Compare

**Architecture:**
- **Mock session.** A plain cookie `ri_session` holds a user id. It's mock-only and gets replaced by Supabase Auth in Part 5.
  - One place decides who may see a shop: the pure `shopAccess()` function plus `loadShopForViewer()`.
  - Pages read the session inside `<Suspense>`, as Cache Components requires.
- **Owner state lives in one in-memory store** (`mock/store.ts`, pinned on `globalThis` so it survives hot reloads). It resets when the server restarts, which is fine for a mock.
- **How data changes:**
  - Form-style changes (login, add shop, settings, alerts, share, sources) are **Server Actions**.
  - Uploads go through **API routes** instead, because a 5,000-row body is over the Server Action body limit (1 MB by default) and because the progress polling matches how the real background jobs will work in Part 4.
- **"Processing" is derived from time.** An upload or Google sync stores when it started. Its stages are computed from how much time has passed, so there are no background timers to manage, and the client simply polls.

**Tech Stack:**
- Existing: Next.js 16.4.1 (`cacheComponents: true`), React 19, Tailwind 4, zod 4, cmdk, motion, d3-scale/d3-shape, vitest + React Testing Library + jsdom.
- **No new dependencies.** The CSV parser is ~40 lines written here.

**Spec:** `docs/superpowers/specs/2026-10-30-frontend-mock-design.md` (§4 screen map, §5 contract, §6 access rule, §7 states, §8 tests, §9 checkpoint 3)

**Deliberate deviations from the spec (kept small):**
- **`guessColumns` is a client-side function** (`lib/upload/columns.ts`), not a `DataSource` method. In Part 1 the file is read in the browser (the spec rules out server-side parsing), so only cleaned rows reach the server.
- **`listShops` takes the viewer's user id** and returns the demo shops plus the shops that user owns.
- **Shop, owner and user data go through new `DataSource` methods:** `getShopOwner`, `createShop`, `getUser`, `saveUser`, `listGoogleLocations`, `markAlertsRead`. The spec's method list didn't need them until now.
- **`Comparison.rows[].net` is `(number | null)[]`.** A shop may not have an aspect the other one has.
- **A first import into an empty shop fills it with the mock dataset of its type.** Restaurant, grocery and electronics shops reuse the demo definitions. Clothing, salon and other use a new generic definition.
- **The Google consent screen is our own page, clearly labelled "Simulated".** It has no Google logo or Google styling, so it can never pass for a real Google sign-in.

## Global Constraints

Everything in the checkpoint 2 plan's Global Constraints still applies. Most importantly:
- Work on branch `feat/frontend-mock` with pnpm only.
- `params`, `cookies()` and `searchParams` are only read inside `<Suspense>`.
- Colours come from tokens only (enforced by `src/test/tokens.test.ts`).
- Client components never import `@/lib/data` or `@/lib/data/mock/*`.
- Use the error contract and the commit rules (with the `Co-Authored-By` line), and run the mirror script after every commit.
- Follow the ERROR_LOG process. No installs.

On top of that:

- **Read the docs first:** `web/node_modules/next/dist/docs/01-app/02-guides/authentication-with-cache-components.md` and `01-getting-started/07-mutating-data.md` before Tasks 3–4 (as `web/AGENTS.md` requires).
- **Session cookie:**
  - name `ri_session`
  - `httpOnly`, `sameSite: "lax"`, `path: "/"`, `secure` in production, 30-day `maxAge`
  - the value is a user id
- **Mock accounts:**
  - `owner@demo.test` signs in as user `u-demo-owner` ("Demo owner"), who owns `spice-indiranagar` and `spice-koramangala`.
  - Any other email signs in as `u-` plus the lowercased email with every character outside `[a-z0-9]` replaced by `-`. That user starts with no shops.
- **Access rule (spec §6):**
  - Demo shops are visible to everyone.
  - Owner shops are visible to their owner only.
  - Logged out → `redirect("/login?next=<path>")`. Logged in but not the owner → `notFound()` ("Shop not found"; never confirm the shop exists).
  - Owner-only pages (`sources`, `uploads`, `alerts`, `share`) on a demo shop → `notFound()`.
  - The same rule applies in API routes: no session → `401 UNAUTHORIZED`, not the owner → `404 NOT_FOUND`.
- **`next` redirect target:** only accept a path that starts with `/` and not `//` or `/\`. Otherwise use `/app`.
- **Upload limits:**
  - `.csv` only (by extension, case-insensitive)
  - ≤ 10 MB
  - ≤ 5,000 data rows
  - each review text 1–5,000 characters after trimming
  - stars integer 1–5 when mapped
  - dates parse as `YYYY-MM-DD`, `DD/MM/YYYY` or ISO datetime when mapped
- **Upload stages:** in this order, with these mock durations in seconds:
  - `Reading file` 1
  - `Cleaning rows` 1
  - `Scoring sentiment` 3
  - `Finding aspects` 3
  - `Updating dashboard` 1
  - A file name matching `/fail/i` fails at `Scoring sentiment` with the message: `The sentiment model didn't respond. Nothing was changed. Try again in a minute.`
- **Google sync:** shows `syncing` for 6 s after Connect or Sync now, then `connected`. The page says `Checks for new reviews every day.`
- **Validation limits:**
  - shop name 1–60 characters (trimmed)
  - settings name 1–60 characters
  - alert email a valid email
  - password ≥ 8 characters at signup and ≥ 1 at login
  - alert threshold 1–50 points
  - rating threshold 1.0–5.0
  - share sections: at least 1 of `overview`, `aspects`, `quotes`
  - share period `30d` | `90d` | `all`
- **Polling:** uploads poll every 1,000 ms and sources every 2,000 ms. Polling stops on a final status or on unmount (use AbortController).
- **No browser `alert`/`confirm`/`prompt` dialogs.** Destructive actions (Disconnect, Revoke) confirm inline with a second button.
- **The dev server must be stopped before `pnpm build`** (Task 13). Check port 3000 afterwards, as in ERROR_LOG 2026-10-31.

## Review Focus

1. **Open redirect through `?next=`.** For example, `/login?next=//evil.example` or `next=https://…` must land on `/app`. Pinned in Task 3 (`safeNext` tests).
2. **Seeing someone else's shop by guessing its URL or API path.** A non-owner must get "Shop not found" or a 404 everywhere: page, upload API, Server Actions. Pinned in Tasks 3, 7 and 9 (action ownership tests).
3. **Messy real-world CSVs:**
   - quoted commas
   - escaped quotes
   - CRLF line endings
   - a UTF-8 BOM
   - blank lines
   - a header-only file

   These should parse or give a specific message, never crash. Pinned in Task 6.
4. **Leaving the page while an upload or sync is processing.** The poll must stop with no state updates after unmount, and history shows the upload when you come back. Pinned in Task 8 (unmount test).
5. **Empty states for a new shop.** Every analytics page should show "No reviews yet" with Connect Google and Upload CSV actions instead of crashing or showing a 404. Pinned in Task 5.

---

## File map

```
web/src/
  lib/data/schemas.ts(+test)                 modify: owner-area schemas + form/request schemas (Task 1)
  lib/data/index.ts                          modify: DataSource methods (Tasks 2, 6, 9–12)
  lib/data/mock/store.ts(+test)              create: globalThis store, seeds, ownership, users, createShop, attachData (Task 2)
  lib/data/mock/shops.ts                     modify: GENERIC_DEF template (Task 2)
  lib/data/mock/index.ts                     modify: wire everything (Tasks 2, 6, 9–12)
  lib/auth/session.ts                        create: getSessionUserId / setSession / clearSession (Task 3)
  lib/auth/access.ts(+test)                  create: shopAccess, safeNext, userIdForEmail (Task 3)
  lib/data/load.ts(+test)                    modify: loadShopForViewer, requireOwnedShop, ownerGuard (Task 3)
  components/shop/{Sidebar,shop-nav,DemoBar,ShopSwitcher}.tsx   modify: viewer-aware nav (Task 3)
  components/shop/EmptyShop.tsx(+test)       create (Task 5)
  app/(public)/login, signup                 create (Task 4)
  app/actions/{auth,shops,sources,alerts,share}.ts   create (Tasks 4, 5, 9, 10, 11)
  app/(app)/app/{layout,page}.tsx, shops/new, settings, compare   create (Tasks 5, 12)
  lib/upload/{csv,columns,rows}.ts(+tests)   create (Task 6)
  lib/data/mock/{uploads,sources,alerts,share,compare}.ts(+tests)   create (Tasks 6, 9–12)
  app/api/shops/[shopId]/uploads/route.ts, [uploadId]/route.ts(+test)   create (Task 7)
  components/upload/*                        create (Task 8)
  components/sources/*, alerts/*, share/*, compare/CompareBars.tsx   create (Tasks 9–12)
  app/(app)/shops/[shopId]/{sources,uploads,alerts,share}/…   create (Tasks 8–11)
  app/(public)/r/[token]/page.tsx            create (Task 11)
```

---

### Task 1: Owner-area data contract

**Files:**
- Modify: `web/src/lib/data/schemas.ts`
- Test: `web/src/lib/data/schemas.test.ts`

**Interfaces — Produces** (zod schema + inferred type for each; datetimes use `z.iso.datetime()`):
- `UserSchema { id, name, email, alertEmail }`
- `StageStatusSchema = "pending"|"running"|"done"|"failed"`; `UploadStageSchema { name, status, seconds? }`
- `ChangeSchema { kind: "rise"|"fall"|"new_aspect", aspectId, deltaPct?, note }`
- `UploadSchema { id, shopId, fileName, createdAt, status: "processing"|"done"|"failed", rowsAccepted, rowsSkipped: {empty, duplicate, invalid}, stages: UploadStage[], changes: Change[], error? }`
- `UploadRowSchema { text (1–5000 trimmed), stars?: 1–5 int, date?: isoDate }`; `UploadRequestSchema { fileName (1–200), rows: UploadRow[] (1–5000), skipped: {empty, duplicate, invalid} }`
- `ColumnRoleSchema = "text"|"stars"|"date"|"ignore"`; `ColumnGuessSchema { column, role, samples: string[] }`
- `SourceSchema { id, shopId, kind: "google"|"csv", status: "connected"|"syncing"|"error"|"disconnected", accountLabel?, locationName?, lastSyncAt?, reviewsImported, error? }`
- `GoogleLocationSchema { id, name, address }`
- `AlertRuleSchema`: a discriminated union on `kind`, each with `{ id, shopId, enabled }`:
  - `aspect_rise` params `{ aspectId, thresholdPts: 1–50 }`
  - `rating_below` params `{ stars: 1–5 }`
  - `new_aspect` params `{}`
  - `digest` params `{ weekday: "mon"…"sun" }`
- `AlertEventSchema { id, shopId, ruleId, createdAt, title, detail, tone, read }`
- `SharePeriodSchema = "30d"|"90d"|"all"`; `ShareSectionSchema = "overview"|"aspects"|"quotes"`; `ShareLinkSchema { token, shopId, period, sections (min 1), createdAt, views, revokedAt: string|null }`
- `ReportSchema { shop, period, sections, headline, kpis, aspects, quotes: Review[] }`
- `ComparisonSchema { shops: Shop[] (length 2), rows: { group, name, net: (number|null)[] }[] }`
- Form schemas: `LoginSchema { email, password ≥1 }`, `SignupSchema { name 1–60, email, password ≥8 }`, `NewShopSchema { name 1–60 trimmed, type: ShopType }`, `SettingsSchema { name 1–60, alertEmail: email }`, `ShareInputSchema { period, sections }`
- `ActionState = { ok: boolean; message?: string; fieldErrors?: Partial<Record<string, string>> }` (a plain type, not a schema)

- [ ] **Step 1: Write failing tests** in `schemas.test.ts` (new `describe("owner-area contract")`):
  - `UploadRequestSchema` rejects 5,001 rows and accepts 5,000 rows.
  - It rejects a row whose text is `"   "`.
  - `AlertRuleSchema` rejects `{kind:"aspect_rise", params:{aspectId:"x", thresholdPts:51}}` and accepts `thresholdPts: 10`.
  - `ShareInputSchema` rejects `sections: []`.
  - `SignupSchema` rejects a 7-character password.
  - `NewShopSchema` trims `"  Bakery  "` to `"Bakery"` and rejects `""`.
- [ ] **Step 2:** `pnpm exec vitest run src/lib/data/schemas.test.ts` → FAIL (exports missing).
- [ ] **Step 3:** Add the schemas and types to `schemas.ts`, following the existing style (shared `count` and `isoDate` helpers; types exported at the bottom).
- [ ] **Step 4:** Re-run → PASS.
- [ ] **Step 5:** Commit `feat(web): contract for owner area, uploads, sources, alerts, sharing and compare`.

---

### Task 2: Mock store, users, ownership and new shops

**Files:**
- Create: `web/src/lib/data/mock/store.ts`, `web/src/lib/data/mock/store.test.ts`
- Modify: `web/src/lib/data/mock/shops.ts` (export `GENERIC_DEF` and `templateFor(type)`), `web/src/lib/data/mock/index.ts`, `web/src/lib/data/index.ts`

**Interfaces:**
- Consumes: `buildDb`, `ShopEntry`, `SHOP_DEFS` (existing).
- Produces:
  - **`store.ts` shape:** `getStore(): Store`, where `Store = { entries: Map<string, ShopEntry>, owners: Map<shopId, userId>, users: Map<userId, User>, uploads: Map<shopId, Upload[]>, sources: Map<shopId, Source[]>, rules: Map<shopId, AlertRule[]>, events: Map<shopId, AlertEvent[]>, links: Map<token, ShareLink> }`.
    - Created once on `globalThis.__riMockStore`.
    - `resetStore()` is for tests only.
  - **`store.ts` functions:**
    - `createShop(userId, {name, type}, now): Shop`
      - Creates an empty shop with id `slug(name)`, plus `-2`, `-3`… on collision.
      - Fields: `reviewCount: 0`, `dateRange` = the current month for both ends, `unreadAlerts: 0`.
      - Stores an entry with **no data** (`overview`/`aspects`/`topics` empty).
    - `attachData(shopId)`
      - Builds data from `templateFor(type)` with the shop's id and name and `isDemo: false`, and replaces the entry.
      - Keeps the shop's `name`, `type` and owner.
  - **`DataSource` additions:**
    - `listShops(userId: string | null)` (signature change; update the existing callers to pass `null` for now — Task 3 passes the session)
    - `getShopOwner(id): Promise<string | null>`
    - `createShop(userId, input): Promise<Shop>`
    - `getUser(id): Promise<User | null>`
    - `saveUser(user): Promise<User>`
- **Seeds:**
  - User `u-demo-owner` = `{name:"Demo owner", email:"owner@demo.test", alertEmail:"owner@demo.test"}`.
  - It owns both `spice-*` shops.
  - Sources, uploads, rules, events and links are seeded in Tasks 6 and 9–11, each in its own module's `seed…()` called from `getStore()`.
- **Empty shops in existing methods:**
  - `getOverview`, `getAspects` and `getTopics` return `null` for an empty shop.
  - `getReviews` returns `{items: [], nextCursor: null, total: 0}`.
  - Task 5 shows the empty state before these are called.
- **`GENERIC_DEF`:**
  - aspects Service, Quality, Price, Staff, Wait time, Cleanliness
  - ~8 hand-written `ReviewDef`s using only those aspects
  - a headline with no shop-type wording
- **`templateFor`:** restaurant → Saffron def, grocery → FreshCart, electronics → VoltHome, everything else → `GENERIC_DEF`.

- [ ] **Step 1: Write failing tests** in `store.test.ts` (call `resetStore()` in `beforeEach`):
  - `listShops(null)` returns exactly the 3 demos.
  - `listShops("u-demo-owner")` returns 5.
  - `createShop("u-x", {name:"Corner Bakery", type:"other"})` returns id `corner-bakery`, `reviewCount 0`, owner `u-x`. A second call returns `corner-bakery-2`.
  - After `attachData("corner-bakery")`:
    - `getAspects` returns a non-empty list with no aspect named `Food`
    - the shop keeps its name
    - every output parses with its zod schema (the same pattern as the existing `mock.test.ts`)
  - `getOverview` of a fresh empty shop is `null`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement. Move the `db` construction in `mock/index.ts` onto `getStore().entries`.
- [ ] **Step 4:** Run the full suite (`pnpm test`) → PASS. Existing tests still pass after the `listShops` signature change.
- [ ] **Step 5:** Commit `feat(web): mock owner store with users, ownership and new empty shops`.

---

### Task 3: Session, access rule and viewer-aware shell

**Files:**
- Create: `web/src/lib/auth/session.ts`, `web/src/lib/auth/access.ts`, `web/src/lib/auth/access.test.ts`, `web/src/lib/data/load.test.ts`
- Modify: `web/src/lib/data/load.ts`, `web/src/app/(app)/shops/[shopId]/layout.tsx`, `web/src/components/shop/{Sidebar,shop-nav,DemoBar,ShopSwitcher,CommandPalette}.tsx`, every `app/(app)/shops/[shopId]/*/page.tsx` loader (swap `requireShop` for `loadShopForViewer`), `web/src/app/page.tsx`

**Interfaces — Produces:**
- **`session.ts`** (server-only; reads `cookies()` from `next/headers`):
  - `getSessionUserId(): Promise<string | null>`
  - `setSession(userId)`
  - `clearSession()`
- **`access.ts`** (pure):
  - `shopAccess(shop: Shop, ownerId: string | null, viewerId: string | null): "ok" | "login" | "not-found"`
  - `safeNext(next: unknown): string`
  - `userIdForEmail(email): string` (the rule in Global Constraints)
- **`load.ts`:**
  - `loadShopForViewer(shopId, path, opts?: { ownerOnly?: boolean }): Promise<{ shop: Shop; viewerId: string | null; canManage: boolean }>`
    - Calls `redirect('/login?next=' + encodeURIComponent(path))` or `notFound()` per the rule.
    - `ownerOnly` on a shop the viewer doesn't own → `notFound()`.
  - `ownerGuard(shopId): Promise<{ userId: string } | { error: "UNAUTHORIZED" | "NOT_FOUND" }>`, for API routes and Server Actions.
- **`shop-nav.ts`:**
  - `visibleNav(canManage: boolean)`
  - The 4 new `ownerOnly` items: `sources` "Sources", `uploads` "Uploads", `alerts` "Alerts", `share` "Share".
  - The Sidebar renders them under a second label, `Manage`, with the unread count badge on Alerts.
- **`Sidebar` props:** `{ shops, current, canManage, user: { name } | null }`.
  - The footer shows `Log in` (link) when logged out.
  - Logged in, it shows `My shops`, `Compare`, `Settings` and a `Log out` form button (wired in Task 4).
- **`DemoBar`:** the link now goes to `/signup`.

- [ ] **Step 1: Write failing tests:**
  - `access.test.ts`:
    - demo shop + `null` viewer → `ok`
    - owner shop + `null` → `login`
    - owner shop + other user → `not-found`
    - owner shop + owner → `ok`
    - `safeNext`: `"/shops/a/overview"` → same; `"//evil.example"`, `"/\\evil"`, `"https://evil.example"`, `undefined`, `42` → `"/app"`
    - `userIdForEmail("Owner@Demo.Test")` → `"u-demo-owner"`; `userIdForEmail("A.B+c@x.io")` → `"u-a-b-c-x-io"`
  - `load.test.ts`:
    - `vi.mock("next/headers")` with a cookie getter.
    - `vi.mock("next/navigation")` so `redirect` throws `Error("REDIRECT:" + url)` and `notFound` throws `Error("NOT_FOUND")`.
    - Logged out on `spice-indiranagar` → throws `REDIRECT:/login?next=%2Fshops%2Fspice-indiranagar%2Foverview`.
    - User `u-other` → throws `NOT_FOUND`.
    - Owner → `canManage: true`.
    - Demo shop with `ownerOnly` → throws `NOT_FOUND`.
    - `ownerGuard` with no cookie → `{error:"UNAUTHORIZED"}`.
  - Extend the existing Sidebar test (or create `Sidebar.test.tsx`):
    - a demo shop with `canManage=false` shows no `Uploads` link
    - an owner shop with `canManage=true` shows all 4 Manage links
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement.
  - The shop layout's `ShopSidebar` reads the session and the user inside its existing Suspense boundary.
  - Page loaders pass their own path (e.g. `` `/shops/${shopId}/topics` ``).
  - `app/page.tsx` stays the temporary start page but lists `listShops(viewerId)` inside a Suspense child.
- [ ] **Step 4:** Run `pnpm test` → PASS. Run `pnpm typecheck` → clean.
- [ ] **Step 5:** Commit `feat(web): mock session and one access rule for shop pages`.

---

### Task 4: Login, signup and logout

**Files:**
- Create: `web/src/app/actions/auth.ts`, `web/src/app/(public)/login/page.tsx`, `web/src/app/(public)/signup/page.tsx`, `web/src/components/auth/AuthForm.tsx`, `web/src/components/auth/AuthForm.test.tsx`

**Interfaces:**
- Consumes: `LoginSchema`, `SignupSchema`, `ActionState`, `setSession`, `clearSession`, `safeNext`, `userIdForEmail`, `data.getUser`/`saveUser`.
- Produces: the Server Actions `login(prev: ActionState, form: FormData)`, `signup(prev, form)` and `logout()`.
  - On success they `redirect(safeNext(form.get("next")))`.
  - `login` creates the user record on first sight (name = the email's local part).
  - `signup` sets the name.
  - `logout` clears the cookie and redirects to `/`.
- `AuthForm({ mode: "login" | "signup", action, next })` is a client component using `useActionState`.
  - It shows field errors under their inputs, a form-level message in `role="alert"`, and a disabled submit button with "Signing in…" while pending.
- **Copy:**
  - Login hint: `Mock sign-in: any email and password work. Use owner@demo.test to see the sample owner shops.`
  - Signup footer: `Already have an account? Log in`. Login footer: `New here? Create an account`.

- [ ] **Step 1: Write failing tests** in `AuthForm.test.tsx` (pass a stub action that returns `{ok:false, fieldErrors:{password:"Use at least 8 characters"}}`):
  - The error renders next to the password field and the field gets `aria-invalid="true"`.
  - Login mode shows the mock hint text.
  - The hidden `next` input carries the given value.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement the actions and pages. Pages read `searchParams.next` inside Suspense and pass it down; the layout uses the workbench style with a single centred panel. Wire the Sidebar's `Log out` button to `logout`.
- [ ] **Step 4:** Run tests → PASS. Manually: `pnpm dev`, log in as `owner@demo.test` → land on `/app` (404 until Task 5 is fine) → open `/shops/spice-indiranagar/overview` → the Manage links appear.
- [ ] **Step 5:** Commit `feat(web): mock login, signup and logout`.

---

### Task 5: Owner area shell, My shops, Add shop, Settings, empty shop state

**Files:**
- Create:
  - `web/src/app/(app)/app/layout.tsx`, `page.tsx`, `shops/new/page.tsx`, `settings/page.tsx`
  - `web/src/app/actions/shops.ts`
  - `web/src/components/owner/{ShopCard,NewShopForm,SettingsForm}.tsx` (+ `ShopCard.test.tsx`, `NewShopForm.test.tsx`)
  - `web/src/components/shop/EmptyShop.tsx` (+ test)
- Modify: every analytics page loader (`overview`, `topics`, `aspects`, `reviews`, `ask`, `try`)

**Interfaces:**
- Consumes: `loadShopForViewer`, `getSessionUserId`, `data.listShops`/`createShop`/`getUser`/`saveUser`/`getOverview`, `Sparkline`.
- Produces:
  - **`/app` layout:** reads the session inside Suspense and redirects to `/login?next=/app` when logged out. It renders the `Sidebar` with `current = null`.
  - **Server Actions:**
    - `createShopAction(prev, form)` validates `NewShopSchema`, calls `data.createShop` and redirects to `/shops/<id>/sources?new=1`.
    - `saveSettings(prev, form)` validates `SettingsSchema`, saves, calls `refresh()` (from `next/cache`) and returns `{ok:true, message:"Saved"}`.
  - **`ShopCard({ shop, monthlyCounts: number[] | null })`** shows:
    - name, type label, review count
    - an `unreadAlerts` badge (`2 new alerts`) when > 0
    - a sparkline of monthly review counts, or the text `No reviews yet` when null
  - **`/app` page:** a grid of the viewer's own shops plus an `Add shop` card.
    - With zero shops: `Add your first shop to see what customers say about it.`, a button, and links to the 3 demo shops.
  - **`/app/shops/new`:** `NewShopForm` with name and type (`<select>` using `shopTypeLabel`).
  - **`/app/settings`:** `SettingsForm` with name and alert email.
  - **`EmptyShop({ shop, canManage })`:**
    - Copy: `No reviews yet` / `Bring in reviews to see sentiment, aspects and topics.`
    - Owners get two actions, `Connect Google Business Profile` → `/shops/<id>/sources/connect` and `Upload a CSV` → `/shops/<id>/uploads/new`.
    - Analytics loaders render it when `shop.reviewCount === 0`, before any data call.

- [ ] **Step 1: Write failing tests:**
  - `ShopCard`:
    - unread 2 → text `2 new alerts`
    - null counts → `No reviews yet`
  - `NewShopForm`: a stub action returning `fieldErrors.name` shows that error.
  - `EmptyShop`:
    - `canManage` → both action links with the right `href`s
    - `!canManage` → no action links
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `pnpm test` → PASS. Manually:
  - new user → `/app` shows the empty state
  - add `Corner Bakery` → lands on its Sources page
  - `/shops/corner-bakery/topics` shows `EmptyShop`
- [ ] **Step 5:** Commit `feat(web): owner area with my shops, add shop, settings and empty shop state`.

---

### Task 6: CSV reading, column guessing and mock upload processing

**Files:**
- Create:
  - `web/src/lib/upload/csv.ts`, `columns.ts`, `rows.ts` (+ one test file each)
  - `web/src/lib/data/mock/uploads.ts`, `web/src/lib/data/mock/uploads.test.ts`
- Modify: `web/src/lib/data/mock/index.ts`, `web/src/lib/data/index.ts`

**Interfaces — Produces:**
- **`parseCsv(text: string): string[][]`** (RFC 4180 subset):
  - strips a leading BOM
  - handles `,` inside quotes, `""` escapes, CRLF/LF, and newlines inside quoted fields
  - drops fully blank lines
- **`guessColumns(header: string[], rows: string[][]): ColumnGuess[]`:**
  - `samples` = the first 3 non-empty values.
  - `stars`: the name matches `/star|rating|score/i` and ≥ 90% of non-empty values are integers 1–5.
  - `date`: the name matches `/date|time|created|posted/i`, or ≥ 90% of values parse as a date.
  - `text`: the name matches `/review|text|comment|feedback|body|content/i`; otherwise the column with the longest average length, if that average is ≥ 20 characters.
  - At most one column per role (the first match wins); the rest are `ignore`.
- **`prepareRows(rows: string[][], mapping: Record<number, ColumnRole>): { accepted: UploadRow[]; skipped: {empty, duplicate, invalid} }`:**
  - `empty` = blank text.
  - `duplicate` = the same trimmed, lowercased text seen before.
  - `invalid` = text over 5,000 characters, stars not an integer 1–5, or a date that won't parse.
  - Dates are normalised to `YYYY-MM-DD`.
- **`checkFile(file: { name: string; size: number }, dataRows?: number): string | null`.** It returns the exact message, or null:
  - `Upload a .csv file. Excel files can be saved as CSV from File → Save As.`
  - `This file is larger than 10 MB.`
  - `This file has {n} rows; the limit is 5,000. Split it and upload it in parts.`
  - `This file has a header row but no reviews.`
- **`mock/uploads.ts`:**
  - `STAGES` (names and seconds from Global Constraints).
  - `uploadAt(stored: StoredUpload, nowMs: number): Upload` derives the stage statuses and the overall status from elapsed time.
    - A `fail` upload stops at stage 3 with `error`.
  - `detectChanges(before: Aspect[], after: Aspect[], thresholdPts = 5): Change[]`:
    - `rise`/`fall` when an aspect's `negPct` moves ≥ the threshold in points
    - `new_aspect` when the aspect wasn't in `before`
    - the note says e.g. `Complaints about Wait time rose 8 points`
  - `seedUploads()`: two past `done` uploads for each `spice-*` shop.
- **`DataSource` additions:**
  - `listUploads(shopId): Promise<Upload[]>` (newest first)
  - `startUpload(shopId, req: UploadRequest): Promise<Upload>`
  - `getUpload(shopId, uploadId): Promise<Upload | null>`
  - When an upload first turns `done`:
    - An empty shop → `attachData`, and `changes` = `new_aspect` for every aspect.
    - Otherwise → `detectChanges(aspects over all months but the last, aspects for the last month)`, `reviewCount += rowsAccepted`, `lastUploadAt` = today.

- [ ] **Step 1: Write failing tests:**
  - `csv.test.ts`:
    - `'a,b\r\n"x, y","say ""hi"""\n'` → `[["a","b"],["x, y",'say "hi"']]`
    - a BOM is stripped
    - a blank line is dropped
    - a quoted newline is kept
  - `columns.test.ts`:
    - header `["Date","Rating","Review"]` → date, stars, text
    - with no name hints, the long free-text column is guessed as text
    - a "Rating" column holding `"great"` values is not `stars`
  - `rows.test.ts`:
    - counts empty, duplicate (case-insensitive) and invalid (stars `"7"`) correctly
    - `"03/10/2026"` → `"2026-10-03"`
  - `checkFile`:
    - `x.xlsx` → the .csv message
    - 5,001 rows → the limit message
    - 0 rows → the header-only message
  - `uploads.test.ts`:
    - at 0 s stage 1 is `running`; at 4 s stages 1–2 are `done` and 3 is `running`; at 9 s the status is `done`
    - a `fail.csv` at 9 s → `failed`, stage 3 `failed`, the error message from Global Constraints
    - `detectChanges` with negPct 10→18 → one `rise` with `deltaPct 8`; a new aspect → `new_aspect`; 10→12 → none
    - a first upload into an empty shop fills it (`getAspects` non-null once `done`)
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement. Inject the time: `DataSource` methods use `Date.now()`, while the pure functions take `nowMs`.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat(web): CSV reading, column guessing and simulated upload processing`.

---

### Task 7: Upload API routes

**Files:**
- Create: `web/src/app/api/shops/[shopId]/uploads/route.ts` (POST), `web/src/app/api/shops/[shopId]/uploads/[uploadId]/route.ts` (GET), `web/src/app/api/shops/[shopId]/uploads/uploads.route.test.ts`
- Modify: `web/src/lib/api.ts` (`ErrorCode` gains `"UNAUTHORIZED"`)

**Interfaces:**
- Consumes: `ownerGuard`, `UploadRequestSchema`, `data.startUpload`/`getUpload`, `apiError`, `firstIssue`, `getRequestId`.
- Produces:
  - `POST` → `201` with an `Upload` body.
  - `GET` → `200` with an `Upload`, or `404`.
  - Responses carry `x-request-id` and `cache-control: no-store`.
  - Auth failures: `401 UNAUTHORIZED` "Log in to upload reviews", `404 NOT_FOUND` "Shop not found".

- [ ] **Step 1: Write failing tests** (mock `next/headers` cookies as in Task 3; call the handlers directly with `new Request(...)` and a `{ params: Promise.resolve({...}) }` context):
  - no cookie → 401 with the error contract
  - user `u-other` on `spice-indiranagar` → 404
  - owner with `rows: []` → 400 `VALIDATION_ERROR`
  - owner with 2 valid rows → 201, `status: "processing"`, `rowsAccepted: 2`
  - `GET` of that id → 200; an unknown id → 404
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement, following `predict/route.ts`.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat(web): upload API routes with owner check and validation`.

---

### Task 8: Uploads page and upload wizard

**Files:**
- Create:
  - `web/src/app/(app)/shops/[shopId]/uploads/page.tsx`, `uploads/new/page.tsx`
  - `web/src/components/upload/{UploadWizard,FileDrop,ColumnMapper,PreviewTable,ProcessingStages,ChangeCards,UploadHistory}.tsx`
  - `web/src/components/upload/UploadWizard.test.tsx`, `UploadHistory.test.tsx`

**Interfaces:**
- Consumes: `parseCsv`, `guessColumns`, `prepareRows`, `checkFile`, `withRetry` from `lib/retry.ts` (for the POST only, not the poll), `fmtDate`, `fmtInt`.
- Produces:
  - **The `UploadWizard({ shopId })` steps:**
    1. `File`: drop zone and file input `accept=".csv"`; reads the file with `file.text()`.
    2. `Columns`: one `<select>` per column (Text, Stars, Date, Ignore), pre-filled by `guessColumns`, showing samples.
    3. `Preview`: the first 5 accepted rows plus the skipped counts.
    4. `Processing`: `ProcessingStages` polls `GET` every 1,000 ms.
    5. `Done`: `ChangeCards` plus `View dashboard` → `/shops/<id>/overview`.
  - **Wizard rules:**
    - `Next` on Columns is disabled until exactly one column is `Text`, with the helper `Pick the column that holds the review text.`
    - A failed stage shows the error in `role="alert"` with `Try again`, which restarts at step 1.
  - **`UploadHistory({ uploads })`:**
    - a table with file, date, accepted, skipped and status
    - processing rows show `Processing…`
    - empty: `No uploads yet.` with an `Upload a CSV` link
  - **Pages:** `uploads` shows the history plus an `Upload a CSV` button; `uploads/new` shows the wizard. Both use `ownerOnly`.

- [ ] **Step 1: Write failing tests** (jsdom; stub `fetch`; use `vi.useFakeTimers({ shouldAdvanceTime: true })` for polling):
  - **Spec test:** upload a `File` whose columns can't be guessed as text (`id,code\n1,A1\n`) → `Next` is disabled; choose `Text` for column `code` → `Next` is enabled.
  - Walks all stages:
    - a CSV with `Review,Rating` → Next → Next
    - POST is called with 2 rows
    - fetch returns a processing upload, then a done upload with one `rise` change
    - the change note text appears, and so does `View dashboard`
  - Unmounting during processing aborts the poll: no fetch calls after unmount, and no React act warnings.
  - `bad.xlsx` shows the `.csv` message.
  - `UploadHistory` with `[]` shows `No uploads yet.`
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement. Stage ticks animate with `motion` (≤ 0.7 s, reduced-motion aware).
- [ ] **Step 4:** Run → PASS. Manually: upload a 3-row CSV to `spice-koramangala`, and upload `fail.csv`.
- [ ] **Step 5:** Commit `feat(web): upload wizard with column mapping, live processing and what changed`.

---

### Task 9: Sources and the simulated Google connection

**Files:**
- Create:
  - `web/src/lib/data/mock/sources.ts` (+ test)
  - `web/src/app/actions/sources.ts` (+ `sources.actions.test.ts`)
  - `web/src/app/(app)/shops/[shopId]/sources/page.tsx`, `sources/connect/page.tsx`
  - `web/src/components/sources/{SourceCards,ConnectGoogleFlow,SyncStatus}.tsx` (+ `ConnectGoogleFlow.test.tsx`)

**Interfaces:**
- Produces:
  - **`DataSource` additions:**
    - `listSources(shopId)`
    - `listGoogleLocations(shopId)`: 3 mock locations — the first has the shop's name; the others are `"{name} · Second branch"` and `"{name} · Kiosk"`; mock addresses
    - `connectGoogle(shopId, { locationId })`
    - `syncSource(shopId, sourceId)`
    - `disconnectSource(shopId, sourceId)`
  - **Status derivation:** `sourceAt(stored, nowMs)`, the same idea as uploads.
    - The first sync into an empty shop calls `attachData` and sets `reviewsImported` to the shop's review count.
    - A later sync adds 0–5 (seeded) reviews.
  - **Seeds:**
    - `spice-indiranagar`: Google `connected`, `accountLabel "owner@demo.test"`, location "Spice Route · Indiranagar", `lastSyncAt` 2026-10-30, `reviewsImported 1240`
    - `spice-koramangala`: a `csv` source only
  - **Server Actions** `connectGoogleAction(shopId, locationId)`, `syncNowAction(shopId, sourceId)` and `disconnectAction(shopId, sourceId)`:
    - Each calls `ownerGuard` first and returns `{ok:false, message:"Shop not found"}` on failure.
    - Then `refresh()`, except connect, which redirects to `/shops/<id>/sources`.
  - **`ConnectGoogleFlow({ shopId, shopName, locations })`, 2 steps:**
    1. A panel headed `Simulated Google consent` with the copy: `In the real app, Google asks you to let Review Intelligence read reviews for your business locations. Nothing leaves this demo.` and the buttons `Allow` / `Cancel`.
    2. `Choose the location to import` as a radio list, then `Import reviews`.
    - No Google logo, colours or wording that imitates Google's own screens.
  - **The `sources` page:**
    - Google card: status, location, last sync, imported count, `Sync now`, and `Disconnect` with inline confirm (`Disconnect` → `Yes, disconnect` / `Keep`).
    - CSV card linking to Uploads.
    - `?new=1` shows the welcome line `Where do this shop's reviews come from?` above both cards.
    - `SyncStatus` polls with `router.refresh()` every 2,000 ms while `syncing`.

- [ ] **Step 1: Write failing tests:**
  - `sources.test.ts`:
    - `connectGoogle` → `syncing` at 0 s and `connected` at 7 s
    - an empty shop has data after the sync
    - `disconnectSource` → `disconnected`
  - `sources.actions.test.ts` (mock `next/headers`, `next/cache`, `next/navigation`): `syncNowAction` as `u-other` on `spice-indiranagar` → `{ok:false, message:"Shop not found"}`, and the source is unchanged.
  - `ConnectGoogleFlow.test.tsx`:
    - shows `Simulated Google consent`
    - `Allow` → the location radios appear
    - `Import reviews` is disabled until one is chosen
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run → PASS. Manually: a new shop → Connect → Allow → pick → watch syncing turn into connected → Overview shows data.
- [ ] **Step 5:** Commit `feat(web): sources page with simulated Google Business Profile connection`.

---

### Task 10: Alerts

**Files:**
- Create:
  - `web/src/lib/data/mock/alerts.ts` (+ test)
  - `web/src/app/actions/alerts.ts`
  - `web/src/app/(app)/shops/[shopId]/alerts/page.tsx`
  - `web/src/components/alerts/{RuleRow,AddRuleForm,AlertFeed}.tsx` (+ `RuleRow.test.tsx`)

**Interfaces:**
- Produces:
  - **`DataSource` additions:**
    - `listAlertRules(shopId)`
    - `saveAlertRule(rule)` (an upsert; a new rule gets id `r-<n>`)
    - `deleteAlertRule(shopId, ruleId)`
    - `listAlertEvents(shopId)` (newest first)
    - `markAlertsRead(shopId)` (sets every event `read` and `unreadAlerts = 0`)
  - **Seeds** for `spice-indiranagar`:
    - an `aspect_rise` rule on its worst aspect, threshold 10
    - `rating_below` 3.5
    - a weekly `digest` on Monday
    - 2 unread events plus 3 read ones, the titles naming real aspect names from the shop's data
  - **Server Actions:** `toggleRule`, `saveRule`, `deleteRule` and `markAllRead`, all guarded with `ownerGuard`.
  - **`RuleRow({ rule, aspectName, onToggle, onSave })`:**
    - Sentence copy per kind:
      - `When complaints about {aspect} rise by {n} points in a week`
      - `When the average rating falls below {stars}★`
      - `When customers start talking about something new`
      - `Weekly summary every {Weekday}`
    - A `role="switch"` button with `aria-checked`.
    - The numeric threshold is editable inline (number input + `Save`).
  - **`AlertFeed({ events })`:** a timeline, with unread events marked by an accent bar and the text `New`.
  - **The page:**
    - the header line `Alerts go to {alertEmail}.` with a `Change` link to `/app/settings`
    - rules, `AddRuleForm` (kind select, then the fields for that kind; aspects come from data), the feed, and a `Mark all read` button

- [ ] **Step 1: Write failing tests:**
  - **Spec test:** `RuleRow` toggle click → `onToggle(id, false)` is called and `aria-checked` flips to `false`.
  - `aspect_rise` renders the sentence with the aspect name.
  - Saving threshold `60` shows `Use a number from 1 to 50` and doesn't call `onSave`.
  - `alerts.test.ts`: `markAlertsRead` sets `unreadAlerts` to 0 and every event to `read`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat(web): alert rules, feed and mark-as-read`.

---

### Task 11: Share links and the public report

**Files:**
- Create:
  - `web/src/lib/data/mock/share.ts` (+ test)
  - `web/src/app/actions/share.ts`
  - `web/src/app/(app)/shops/[shopId]/share/page.tsx`
  - `web/src/app/(public)/r/[token]/page.tsx`
  - `web/src/components/share/{ShareForm,LinkList,ReportView}.tsx` (+ `LinkList.test.tsx`)

**Interfaces:**
- Produces:
  - **`DataSource` additions:**
    - `listShareLinks(shopId)`
    - `createShareLink(shopId, input: ShareInput)`: the token is 16 lowercase hex characters from `crypto.randomUUID()`
    - `revokeShareLink(shopId, token)`
    - `getReport(token): Promise<Report | null>`
      - Returns null for an unknown or revoked token.
      - Increments `views`.
      - The period maps to the last 1, 3 or all months via `lastMonths`/`fullRange`.
      - Only the chosen sections are filled; `quotes` = up to 3 helpful reviews.
  - **Seed:** one active link for `spice-indiranagar`.
  - **Server Actions:** `createLinkAction(shopId, prev, form)` and `revokeLinkAction(shopId, token)`, both guarded.
  - **`LinkList({ links, origin })`:**
    - each row shows the URL `/r/<token>`, the period, the sections, the views, `Copy` (`navigator.clipboard.writeText`, then the label `Copied` for 2 s), `Open` and `Revoke` (with inline confirm)
    - a revoked row shows `Revoked` and its `Copy`/`Open` are disabled
  - **`/r/[token]`:**
    - wrapped in `.theme-light`
    - `metadata.robots = { index: false }`
    - `ReportView` shows the shop name, period, `Headline`, `KpiRow`, `AspectBars` and quotes
    - a `Print or save as PDF` button (`window.print()`) that is hidden under `@media print`
    - an unknown or revoked token shows `This report link is no longer active.` with a link home, and the same message for both, so it never reveals which

- [ ] **Step 1: Write failing tests:**
  - **Spec test:** `LinkList` revoke flow: `Revoke` → `Yes, revoke` → the action is called, and once it is rerendered with `revokedAt` set, `Copy` is disabled and `Revoked` is shown.
  - `share.test.ts`:
    - `createShareLink` → token matches `/^[0-9a-f]{16}$/`
    - `getReport` increments views
    - `getReport` of a revoked token → null
    - sections `["aspects"]` → the report has aspects and no quotes
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run → PASS. Manually: create a link, open it in a logged-out headless browser, revoke it, reload.
- [ ] **Step 5:** Commit `feat(web): share links and a printable public report`.

---

### Task 12: Compare shops

**Files:**
- Create:
  - `web/src/lib/data/mock/compare.ts` (+ test)
  - `web/src/app/(app)/app/compare/page.tsx`
  - `web/src/components/compare/{ComparePicker,CompareBars}.tsx` (+ `CompareBars.test.tsx`)

**Interfaces:**
- Produces:
  - **`DataSource` addition:** `compare(ids: [string, string]): Promise<Comparison | null>`.
    - Rows are the union of aspect names, matched case-insensitively, using the first shop's casing.
    - `net = posPct − negPct` rounded, or `null` when a shop lacks the aspect.
    - `group` comes from the aspect, or `"Other"`.
    - Sorted by the largest absolute gap first.
  - **The page:**
    - `?a=&b=` read inside Suspense
    - `ComparePicker` offers the viewer's own shops plus the demos (two `<select>`s, `Compare` submits a GET form)
    - non-viewable ids → `notFound()`
    - the same id twice → `Pick two different shops.`
  - **`CompareBars({ comparison })`:**
    - one row per aspect, with two diverging bars labelled with each shop's name, and signed numbers (`fmtSigned`)
    - a gap ≥ 15 points gets the label `Gap: {n} pts` and the accent border
    - a `null` value shows `Not mentioned`

- [ ] **Step 1: Write failing tests:**
  - `compare.test.ts`:
    - comparing `saffron-table` and `spice-indiranagar` → shared restaurant aspects line up in one row each
    - comparing `saffron-table` and `volthome` → `Food` has `net[1] === null`
  - `CompareBars.test.tsx`:
    - a row with nets `[40, 10]` shows `Gap: 30 pts`
    - `null` shows `Not mentioned`
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat(web): compare two shops aspect by aspect`.

---

### Task 13: Verify, document and stop for review

**Files:** Modify `README.md` (status line), `ERROR_LOG.md` (any incidents), `docs/superpowers/specs/2026-10-30-frontend-mock-design.md` (only if a deviation needs recording).

- [ ] **Step 1:** Run `pnpm lint && pnpm typecheck && pnpm test` → all pass, and record the test count.
- [ ] **Step 2:** Stop the dev server, then check port 3000 and free memory (`(Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory`). Then run `pnpm build`, which must pass. Then `pnpm start` in the background.
- [ ] **Step 3: Headless walkthrough** with the browser-automation skill, in **one `--script` run** so cookies persist. Assert 0 console errors and 0 failed requests, and screenshot each screen:
  1. logged-out `/shops/spice-indiranagar/overview` → lands on `/login?next=…`
  2. log in as `owner@demo.test` → back on that overview, with the Manage links visible
  3. Sources, Uploads (run the wizard with a 3-row CSV through to `Done`), Alerts (toggle a rule), Share (create a link)
  4. open the share link in a fresh context → the light report
  5. `/app`, `/app/compare?a=saffron-table&b=spice-indiranagar`, `/app/settings`
  6. log out → log in as `someone@else.test` → `/shops/spice-indiranagar/overview` shows `Shop not found`
  7. add a shop → Connect Google → it fills with data
- [ ] **Step 4:** Read every screenshot, and fix any clipped text, overlaps or blank areas (each fix gets its own commit).
- [ ] **Step 5:** Stop `pnpm start` and confirm port 3000 is free. Update the README status to `checkpoint 3 done` and commit `docs: checkpoint 3 status`. Run the mirror script.
- [ ] **Step 6: STOP.** Summarise for the user: what was built, how to run it (`pnpm dev`, then log in as `owner@demo.test`), and the screenshots. Wait for their go-ahead before checkpoint 4.
