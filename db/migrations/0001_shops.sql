-- Shops and everything the dashboard shows about them (Part 3 design).
-- Each table holds one shop's rows; deleting a shop deletes them all.

create table shops (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9-]{0,63}$'),
  name text not null check (length(name) between 1 and 120),
  type text not null check (type in ('restaurant', 'grocery', 'electronics', 'clothing', 'salon', 'other')),
  is_demo boolean not null default false,
  -- Null for demo shops. Becomes a real auth.users id once Part 5 adds Supabase Auth.
  owner_id uuid references auth.users (id) on delete cascade,
  review_count integer not null default 0 check (review_count >= 0),
  date_from text check (date_from ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  date_to text check (date_to ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  headline jsonb not null default '{"parts": [{"text": "No reviews yet."}]}',
  top_complaints jsonb not null default '[]',
  model text,
  last_upload_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (is_demo = (owner_id is null))
);
create index shops_owner_idx on shops (owner_id);

-- The shop's review counts per month: the Overview chart and every KPI for a date range.
create table shop_months (
  shop_id text not null references shops (id) on delete cascade,
  month text not null check (month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  count integer not null check (count >= 0),
  pos integer not null check (pos >= 0),
  neg integer not null check (neg >= 0),
  neu integer not null check (neu >= 0),
  stars integer[] check (stars is null or cardinality(stars) = 5), -- 1★..5★, null without ratings
  primary key (shop_id, month),
  check (pos + neg + neu = count)
);

create table aspects (
  shop_id text not null references shops (id) on delete cascade,
  id text not null,
  name text not null,
  grp text,
  is_new boolean not null default false,
  mentions integer not null check (mentions >= 0),
  pos_pct real not null,
  neg_pct real not null,
  neu_pct real not null,
  monthly jsonb not null default '[]', -- [{month, count, pos, neg, neu}]
  example_review_ids text[] not null default '{}',
  reasons jsonb not null default '[]', -- the words behind the tone, from Part 2
  rank integer not null, -- most mentioned first
  primary key (shop_id, id)
);

create table reviews (
  shop_id text not null references shops (id) on delete cascade,
  id text not null,
  date date, -- null when the source had no usable date
  stars smallint check (stars between 1 and 5),
  text text not null check (length(text) between 1 and 5000),
  sentiment text not null check (sentiment in ('positive', 'negative', 'neutral')),
  score real,
  confidence real not null check (confidence between 0 and 1),
  aspect_mentions jsonb not null default '[]', -- [{aspectId, start, end, sentiment}]
  aspect_ids text[] not null default '{}', -- the same aspects, for the "filter by aspect" index
  search tsvector generated always as (to_tsvector('english', text)) stored,
  primary key (shop_id, id)
);
create index reviews_shop_date_idx on reviews (shop_id, date desc nulls last, id);
create index reviews_aspects_idx on reviews using gin (aspect_ids);
create index reviews_search_idx on reviews using gin (search);

-- Row-level security: the browser never gets a key that can write, and a leaked anon key reads
-- only what the public site shows anyway. The server uses the service role, which bypasses RLS.
alter table shops enable row level security;
alter table shop_months enable row level security;
alter table aspects enable row level security;
alter table reviews enable row level security;

create function visible_shop(shop text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from shops s
    where s.id = shop and (s.is_demo or (auth.uid() is not null and s.owner_id = auth.uid()))
  )
$$;

create policy "demo shops and your own" on shops for select to anon, authenticated
  using (is_demo or (owner_id is not null and owner_id = auth.uid()));
create policy "rows of visible shops" on shop_months for select to anon, authenticated
  using (visible_shop(shop_id));
create policy "rows of visible shops" on aspects for select to anon, authenticated
  using (visible_shop(shop_id));
create policy "rows of visible shops" on reviews for select to anon, authenticated
  using (visible_shop(shop_id));
