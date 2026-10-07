-- =====================================================================
--  Vault & Vine — initial schema
--  Every row belongs to exactly one signed-in user (auth.users.id).
--  Row Level Security makes sure a user can only ever see / change
--  their own rows — even though the publishable key is public.
--
--  Run once in Supabase → SQL Editor → New query → paste → Run.
--  Safe to re-run: it only creates what is missing.
-- =====================================================================

-- ---------- helpers ---------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------- profiles: one row per user (preferences) ------------------
create table if not exists public.profiles (
  id               uuid primary key references auth.users (id) on delete cascade,
  display_name     text check (char_length(display_name) <= 80),
  display_currency text not null default 'USD' check (display_currency in ('USD','INR')),
  metal_currency   text not null default 'INR' check (metal_currency in ('USD','INR')),
  owners           text[] not null default array['Self','Spouse','Joint','Kids','Family'],
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ---------- holdings: assets and liabilities --------------------------
create table if not exists public.holdings (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind        text not null check (kind in ('asset','liability')),
  name        text not null check (char_length(name) between 1 and 120),
  type        text not null check (type in ('Stock','SIP','SB','FD','Gold','Silver','Metal','Equity','CR')),
  owner       text not null default 'Family' check (char_length(owner) <= 40),
  currency    text not null default 'USD' check (currency in ('USD','INR')),
  amount      numeric(18,2) check (amount is null or amount >= 0),   -- invested / balance owed
  -- precious-metal fields (only for Gold / Silver / Metal)
  metal       text check (metal in ('gold','silver','platinum','palladium')),
  qty         numeric(18,4) check (qty is null or qty >= 0),
  unit        text check (unit in ('g','kg','tola','sov','ozt')),
  purity      text check (char_length(purity) <= 20),
  notes       text check (char_length(notes) <= 1000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint liability_type check ((kind = 'liability') = (type = 'CR'))
);
create index if not exists holdings_user_id_idx on public.holdings (user_id);

-- ---------- rate_settings: FX + metal price sources per user ----------
--  value = INR per 1 USD for key 'fx'; USD per gram of pure metal otherwise
create table if not exists public.rate_settings (
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  key          text not null check (key in ('fx','gold','silver','platinum','palladium')),
  mode         text not null default 'auto' check (mode in ('auto','manual')),
  preset       text,
  url          text check (char_length(url) <= 500),
  path         text check (char_length(path) <= 120),
  unit         text check (unit in ('g','kg','tola','sov','ozt')),
  ccy          text check (ccy in ('USD','INR')),
  quoted       text check (char_length(quoted) <= 20),
  header_name  text check (char_length(header_name) <= 80),
  header_value text check (char_length(header_value) <= 300),   -- API key, visible only to its owner
  premium      numeric(6,2) not null default 0,
  value        numeric(18,6) check (value is null or value > 0),
  status       text,
  fetched_at   timestamptz,
  updated_at   timestamptz not null default now(),
  primary key (user_id, key)
);

-- ---------- snapshots: monthly net-worth history ----------------------
create table if not exists public.snapshots (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  snap_date        date not null default current_date,
  assets_usd       numeric(18,2) not null,
  liabilities_usd  numeric(18,2) not null,
  net_worth_usd    numeric(18,2) not null,
  fx               numeric(12,4),
  gold22_inr_g     numeric(12,2),
  created_at       timestamptz not null default now(),
  unique (user_id, snap_date)
);

-- ---------- updated_at triggers ---------------------------------------
drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
drop trigger if exists holdings_updated_at on public.holdings;
create trigger holdings_updated_at before update on public.holdings
  for each row execute function public.set_updated_at();
drop trigger if exists rate_settings_updated_at on public.rate_settings;
create trigger rate_settings_updated_at before update on public.rate_settings
  for each row execute function public.set_updated_at();

-- ---------- auto-create a profile when someone signs up ---------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
--  SECURITY: Row Level Security — each user sees only their own rows
-- =====================================================================
alter table public.profiles      enable row level security;
alter table public.holdings      enable row level security;
alter table public.rate_settings enable row level security;
alter table public.snapshots     enable row level security;

-- Signed-out visitors (anon key) get nothing at all.
revoke all on public.profiles, public.holdings, public.rate_settings, public.snapshots from anon;
grant select, insert, update, delete on public.holdings, public.rate_settings, public.snapshots to authenticated;
grant select, insert, update on public.profiles to authenticated;

-- profiles
drop policy if exists "own profile: read"   on public.profiles;
drop policy if exists "own profile: insert" on public.profiles;
drop policy if exists "own profile: update" on public.profiles;
create policy "own profile: read"   on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "own profile: insert" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "own profile: update" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- holdings / rate_settings / snapshots: identical owner-only policies
do $$
declare t text;
begin
  foreach t in array array['holdings','rate_settings','snapshots'] loop
    execute format('drop policy if exists "own rows: read"   on public.%I', t);
    execute format('drop policy if exists "own rows: insert" on public.%I', t);
    execute format('drop policy if exists "own rows: update" on public.%I', t);
    execute format('drop policy if exists "own rows: delete" on public.%I', t);
    execute format('create policy "own rows: read"   on public.%I for select to authenticated using ((select auth.uid()) = user_id)', t);
    execute format('create policy "own rows: insert" on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "own rows: update" on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "own rows: delete" on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', t);
  end loop;
end $$;

-- Backfill profiles for anyone who signed up before this script ran
insert into public.profiles (id, display_name)
select u.id, coalesce(u.raw_user_meta_data ->> 'full_name', split_part(u.email, '@', 1))
from auth.users u
on conflict (id) do nothing;
