# Part 3: shop database: design

> Status: approved in chat 2026-11-02. The user chose "invented text, real models" for the demo shops.

## Why

The web app reads mock data generated in the browser's server process. Part 3 gives it a real
database (Supabase Postgres). The public demo shops then show genuine Part 2 model output
instead of hand-set numbers.

## Goals

- **Postgres schema in `db/migrations/`**, applied by `pipeline/scripts/migrate.py`, which records what has run.
  - Tables: `shops`, `shop_months`, `aspects`, `reviews`. A shop owns all of its rows: they are deleted with the shop.
- **Row-level security on every table:**
  - `anon` and `authenticated` can **read demo shops** only;
  - an `authenticated` user can also read shops whose `owner_id = auth.uid()` (used once Part 5 brings Supabase Auth);
  - no write policies, so only the server's service role can write.
- **Idempotent loader.** `load_shop(conn, meta, report)` turns a Part 2 `ShopReport` into rows and replaces that shop's rows in one transaction. Loading twice gives the same row counts.
- **Demo shops with invented text.**
  - Original reviews for Saffron Table, FreshCart Grocery and VoltHome Appliances are written by an LLM (Gemini) and committed in `pipeline/demo/`.
  - They are scored by the real Part 2 pipeline and loaded.
  - No Yelp or Amazon text ever goes into the database.
- **The web app reads demo shops from the database** when `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set, and uses mock data otherwise, so tests and offline development still work.

## Non-goals (later parts)

Owner shops, users, uploads, sources, alerts and share links stay in the mock store until:
- Part 4 (processing jobs);
- Part 5 (Supabase Auth gives real user ids for `owner_id`).

Embeddings and search for chat come in Part 6.

## Decisions

- **Rows hold what the screens read.** Monthly series and example ids are stored as `jsonb` and arrays, not normalised further: every read is "one shop's everything".
  - Reviews get an `aspect_ids text[]` column (GIN index) for the aspect filter.
  - They also get a generated `tsvector` column (GIN index) for search.
- **The loader computes in Python** what Part 2 leaves out:
  - the headline (best and worst aspect);
  - top complaints (the worst aspects, each with a negative quote);
  - the date range and the star mix.
- **Topics** are derived in the web app from aspects and reviews, as the mock already does, until a topic model exists.
- **Reviews without a date** are kept, with a null date: uploads (Part 4) often lack one.
  - The web contract allows `date: null`. Such reviews show "No date" and sort last.
- **The web app talks to Supabase over HTTPS with `@supabase/supabase-js`** and the service-role key, server-only. HTTP suits Vercel's short-lived functions better than a pooled Postgres connection.
- **Ids:** shop ids are text (the existing `saffron-table`). Review ids are unique per shop (`r1`…).

## Done when

- Migrations apply to the Supabase project, and re-running applies nothing.
- `pytest` passes, including database tests that run inside a rolled-back transaction when `DATABASE_URL` is set:
  - loading is idempotent;
  - RLS hides owner shops from `anon` and from other users.
- `pnpm test`, `pnpm typecheck`, `pnpm lint` and `pnpm build` pass. With the database env set, the three demo shops render real model output locally.
- The database stays far under the 500 MB free limit (the size is printed by the loader).
