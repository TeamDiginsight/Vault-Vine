-- =====================================================================
--  Vault & Vine — Stocks module
--  Tracks individual stock holdings with live price data
-- =====================================================================

-- ---------- stocks: individual stock holdings --------------------------
create table if not exists public.stocks (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  ticker         text not null check (char_length(ticker) <= 20),
  stock_name     text check (char_length(stock_name) <= 150),
  exchange       text check (char_length(exchange) <= 20),
  buy_date       date not null,
  buy_price      numeric(18,4) not null check (buy_price > 0),
  quantity       numeric(18,4) not null check (quantity > 0),
  currency       text not null default 'USD' check (currency in ('USD','INR')),
  notes          text check (char_length(notes) <= 500),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint ticker_format check (ticker ~ '^[A-Z0-9.]{1,20}$')
);
create index if not exists stocks_user_id_idx on public.stocks (user_id);
create index if not exists stocks_ticker_idx on public.stocks (ticker);

-- ---------- stock_prices: historical price data for charting ---------
create table if not exists public.stock_prices (
  id             uuid primary key default gen_random_uuid(),
  ticker         text not null check (char_length(ticker) <= 20),
  price_date     date not null,
  price          numeric(18,4) not null check (price > 0),
  currency       text not null default 'USD' check (currency in ('USD','INR')),
  source         text default 'finnhub',
  created_at     timestamptz not null default now(),
  unique (ticker, price_date)
);
create index if not exists stock_prices_ticker_idx on public.stock_prices (ticker);
create index if not exists stock_prices_date_idx on public.stock_prices (price_date);

-- ---------- updated_at triggers ---------------------------------------
drop trigger if exists stocks_updated_at on public.stocks;
create trigger stocks_updated_at before update on public.stocks
  for each row execute function public.set_updated_at();

-- =====================================================================
--  SECURITY: Row Level Security for stocks
-- =====================================================================
alter table public.stocks       enable row level security;
alter table public.stock_prices enable row level security;

-- Stock prices are readable by anyone (public data)
revoke all on public.stock_prices from anon;
grant select on public.stock_prices to anon, authenticated;

-- User can only see/manage their own stocks
revoke all on public.stocks from anon;
grant select, insert, update, delete on public.stocks to authenticated;

drop policy if exists "own stocks: read"   on public.stocks;
drop policy if exists "own stocks: insert" on public.stocks;
drop policy if exists "own stocks: update" on public.stocks;
drop policy if exists "own stocks: delete" on public.stocks;
create policy "own stocks: read"   on public.stocks for select to authenticated using ((select auth.uid()) = user_id);
create policy "own stocks: insert" on public.stocks for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own stocks: update" on public.stocks for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own stocks: delete" on public.stocks for delete to authenticated using ((select auth.uid()) = user_id);
