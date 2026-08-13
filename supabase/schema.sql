create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.anvat_categories (
  id text primary key,
  name text not null,
  icon text not null default '📦',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.anvat_products (
  id text primary key,
  name text not null,
  price integer not null check (price >= 0),
  category_id text not null references public.anvat_categories(id) on delete cascade,
  image text not null default '🍽',
  variants jsonb not null default '[]'::jsonb,
  options jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.anvat_orders (
  id uuid primary key default gen_random_uuid(),
  number text not null,
  status text not null check (status in ('new', 'preparing', 'completed', 'cancelled')),
  payment_status text default 'pending' check (payment_status in ('pending', 'paid')),
  kitchen_release_status text not null default 'released' check (kitchen_release_status in ('hold', 'released')),
  order_type text not null check (order_type in ('dine-in', 'takeaway', 'delivery')),
  order_info text not null default '',
  payment_method text not null default '',
  subtotal integer not null default 0 check (subtotal >= 0),
  discount_amount integer not null default 0 check (discount_amount >= 0),
  discount_type text,
  discount_value numeric not null default 0 check (discount_value >= 0),
  total integer not null check (total >= 0),
  item_count integer not null check (item_count >= 0),
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.anvat_orders
  add column if not exists payment_status text,
  add column if not exists kitchen_release_status text not null default 'released',
  add column if not exists subtotal integer not null default 0,
  add column if not exists discount_amount integer not null default 0,
  add column if not exists discount_type text,
  add column if not exists discount_value numeric not null default 0,
  add column if not exists customer_name text,
  add column if not exists delivery_address text,
  add column if not exists customer_note text,
  add column if not exists order_source text not null default 'pos';

update public.anvat_orders
set payment_status = 'paid'
where payment_status is null;

update public.anvat_orders
set kitchen_release_status = case
  when payment_status = 'paid' then 'released'
  else 'hold'
end
where kitchen_release_status is null;

alter table public.anvat_orders
  alter column payment_status set default 'pending';

alter table public.anvat_orders
  alter column payment_status set not null;

alter table public.anvat_orders
  alter column kitchen_release_status set default 'released';

alter table public.anvat_orders
  alter column kitchen_release_status set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'anvat_orders_payment_status_check'
  ) then
    alter table public.anvat_orders
      add constraint anvat_orders_payment_status_check
      check (payment_status in ('pending', 'paid'));
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'anvat_orders_kitchen_release_status_check'
  ) then
    alter table public.anvat_orders
      add constraint anvat_orders_kitchen_release_status_check
      check (kitchen_release_status in ('hold', 'released'));
  end if;
end
$$;

create table if not exists public.anvat_ingredients (
  id text primary key,
  name text not null,
  unit text not null default 'ml',
  stock_quantity numeric not null default 0 check (stock_quantity >= 0),
  low_stock_threshold numeric not null default 0 check (low_stock_threshold >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.anvat_product_ingredients (
  id text primary key,
  product_id text not null references public.anvat_products(id) on delete cascade,
  ingredient_id text not null references public.anvat_ingredients(id) on delete cascade,
  quantity numeric not null default 0 check (quantity >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  unique(product_id, ingredient_id)
);

create table if not exists public.anvat_cash_entries (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  amount integer not null check (amount >= 0),
  entry_type text not null check (entry_type in ('income', 'expense')),
  category text not null default 'Khác',
  note text not null default '',
  channel text not null default 'cash' check (channel in ('cash', 'bank', 'other')),
  occurred_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists set_anvat_categories_updated_at on public.anvat_categories;
create trigger set_anvat_categories_updated_at
before update on public.anvat_categories
for each row
execute function public.set_updated_at();

drop trigger if exists set_anvat_products_updated_at on public.anvat_products;
create trigger set_anvat_products_updated_at
before update on public.anvat_products
for each row
execute function public.set_updated_at();

drop trigger if exists set_anvat_orders_updated_at on public.anvat_orders;
create trigger set_anvat_orders_updated_at
before update on public.anvat_orders
for each row
execute function public.set_updated_at();

drop trigger if exists set_anvat_ingredients_updated_at on public.anvat_ingredients;
create trigger set_anvat_ingredients_updated_at
before update on public.anvat_ingredients
for each row
execute function public.set_updated_at();

drop trigger if exists set_anvat_cash_entries_updated_at on public.anvat_cash_entries;
create trigger set_anvat_cash_entries_updated_at
before update on public.anvat_cash_entries
for each row
execute function public.set_updated_at();

alter table public.anvat_categories enable row level security;
alter table public.anvat_products enable row level security;
alter table public.anvat_orders enable row level security;
alter table public.anvat_ingredients enable row level security;
alter table public.anvat_product_ingredients enable row level security;
alter table public.anvat_cash_entries enable row level security;

drop policy if exists "public read anvat_categories" on public.anvat_categories;
create policy "public read anvat_categories"
on public.anvat_categories
for select
to anon, authenticated
using (true);

drop policy if exists "public write anvat_categories" on public.anvat_categories;
create policy "public write anvat_categories"
on public.anvat_categories
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "public read anvat_products" on public.anvat_products;
create policy "public read anvat_products"
on public.anvat_products
for select
to anon, authenticated
using (true);

drop policy if exists "public write anvat_products" on public.anvat_products;
create policy "public write anvat_products"
on public.anvat_products
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "public read anvat_orders" on public.anvat_orders;
create policy "public read anvat_orders"
on public.anvat_orders
for select
to anon, authenticated
using (true);

drop policy if exists "public write anvat_orders" on public.anvat_orders;
create policy "public write anvat_orders"
on public.anvat_orders
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "public read anvat_ingredients" on public.anvat_ingredients;
create policy "public read anvat_ingredients"
on public.anvat_ingredients
for select
to anon, authenticated
using (true);

drop policy if exists "public write anvat_ingredients" on public.anvat_ingredients;
create policy "public write anvat_ingredients"
on public.anvat_ingredients
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "public read anvat_product_ingredients" on public.anvat_product_ingredients;
create policy "public read anvat_product_ingredients"
on public.anvat_product_ingredients
for select
to anon, authenticated
using (true);

drop policy if exists "public write anvat_product_ingredients" on public.anvat_product_ingredients;
create policy "public write anvat_product_ingredients"
on public.anvat_product_ingredients
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "public read anvat_cash_entries" on public.anvat_cash_entries;
create policy "public read anvat_cash_entries"
on public.anvat_cash_entries
for select
to anon, authenticated
using (true);

drop policy if exists "public write anvat_cash_entries" on public.anvat_cash_entries;
create policy "public write anvat_cash_entries"
on public.anvat_cash_entries
for all
to anon, authenticated
using (true)
with check (true);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'anvat_categories'
  ) then
    alter publication supabase_realtime add table public.anvat_categories;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'anvat_products'
  ) then
    alter publication supabase_realtime add table public.anvat_products;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'anvat_orders'
  ) then
    alter publication supabase_realtime add table public.anvat_orders;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'anvat_ingredients'
  ) then
    alter publication supabase_realtime add table public.anvat_ingredients;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'anvat_product_ingredients'
  ) then
    alter publication supabase_realtime add table public.anvat_product_ingredients;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'anvat_cash_entries'
  ) then
    alter publication supabase_realtime add table public.anvat_cash_entries;
  end if;
end
$$;

-- =========================================================================
-- LOYALTY SYSTEM SCHEMAS
-- =========================================================================

-- 1. Create customers table
create table if not exists public.anvat_customers (
  phone text primary key,
  name text,
  points integer not null default 0 check (points >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists set_updated_at_anvat_customers on public.anvat_customers;
create trigger set_updated_at_anvat_customers
  before update on public.anvat_customers
  for each row execute function public.set_updated_at();

alter table public.anvat_customers enable row level security;
drop policy if exists "Allow public access to customers" on public.anvat_customers;
create policy "Allow public access to customers" on public.anvat_customers for all using (true) with check (true);

-- 2. Create point history table
create table if not exists public.anvat_point_history (
  id uuid primary key default gen_random_uuid(),
  customer_phone text not null references public.anvat_customers(phone) on delete cascade,
  order_id uuid references public.anvat_orders(id) on delete set null,
  points_change integer not null,
  reason text not null,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.anvat_point_history enable row level security;
drop policy if exists "Allow public access to point history" on public.anvat_point_history;
create policy "Allow public access to point history" on public.anvat_point_history for all using (true) with check (true);

-- 3. Add columns to public.anvat_orders
alter table public.anvat_orders
  add column if not exists customer_phone text references public.anvat_customers(phone) on delete set null,
  add column if not exists earned_points integer not null default 0,
  add column if not exists spent_points integer not null default 0;

-- 4. Add new tables to realtime publication
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'anvat_customers'
  ) then
    alter publication supabase_realtime add table public.anvat_customers;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'anvat_point_history'
  ) then
    alter publication supabase_realtime add table public.anvat_point_history;
  end if;
end
$$;

-- 5. Create promotions table
create table if not exists public.anvat_promotions (
  code text primary key,
  description text,
  discount_type text not null check (discount_type in ('amount', 'percent')),
  discount_value numeric not null check (discount_value >= 0),
  min_order_value numeric not null default 0 check (min_order_value >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists set_updated_at_anvat_promotions on public.anvat_promotions;
create trigger set_updated_at_anvat_promotions
  before update on public.anvat_promotions
  for each row execute function public.set_updated_at();

alter table public.anvat_promotions enable row level security;
drop policy if exists "Allow public access to promotions" on public.anvat_promotions;
create policy "Allow public access to promotions" on public.anvat_promotions for all using (true) with check (true);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'anvat_promotions'
  ) then
    alter publication supabase_realtime add table public.anvat_promotions;
  end if;
end
$$;
