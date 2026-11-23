-- =============================================================================
-- PCForge: product catalog, offers and prices
-- =============================================================================
-- product          a model (e.g. "AMD Ryzen 7 7800X3D")
-- product_variant  a purchasable SKU of it (colour, capacity, kit size...)
-- offer            one retailer selling one variant in one region
-- price_history    every observed price/stock change of an offer
--
-- Technical specs are JSONB, validated server-side by the Zod schema for the
-- product's category (src/lib/catalog/specs.ts). The compatibility engine
-- reads them, so keep the keys in sync with that file.

-- -----------------------------------------------------------------------------
-- Products
-- -----------------------------------------------------------------------------

create table public.products (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique check (slug ~ '^[a-z0-9-]+$'),
  category_slug text not null references public.categories (slug),
  brand_id      uuid not null references public.brands (id),
  name          text not null,                      -- full display name
  model         text not null,                      -- manufacturer model / part family
  description   text,
  image_urls    text[] not null default '{}',
  specs         jsonb not null default '{}'::jsonb check (jsonb_typeof(specs) = 'object'),
  -- Typical (not peak) power draw in watts, used for build power estimates.
  power_draw_w  integer check (power_draw_w >= 0),
  -- Relative performance score (0-100) within the category; drives tiers.
  performance_score smallint check (performance_score between 0 and 100),
  release_date  date,
  status        public.product_status not null default 'draft',
  search_vector tsvector,
  created_by    uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index products_category_idx on public.products (category_slug, status);
create index products_brand_idx on public.products (brand_id);
create index products_specs_idx on public.products using gin (specs jsonb_path_ops);
create index products_search_idx on public.products using gin (search_vector);
create index products_name_trgm_idx on public.products using gin (name extensions.gin_trgm_ops);

create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();

-- Keep the full-text vector in sync. Uses the 'simple' config because names
-- and models are mostly brand terms that should not be stemmed, and the app
-- serves several languages.
create or replace function public.products_search_vector()
returns trigger
language plpgsql
as $$
declare
  brand_name text;
begin
  select b.name into brand_name from public.brands b where b.id = new.brand_id;
  new.search_vector :=
      setweight(to_tsvector('simple', coalesce(new.name, '')), 'A')
   || setweight(to_tsvector('simple', coalesce(brand_name, '')), 'A')
   || setweight(to_tsvector('simple', coalesce(new.model, '')), 'B')
   || setweight(to_tsvector('simple', coalesce(new.category_slug, '')), 'C')
   || setweight(to_tsvector('simple', coalesce(new.description, '')), 'D');
  return new;
end;
$$;

create trigger products_search_vector_trg
  before insert or update of name, model, brand_id, category_slug, description on public.products
  for each row execute function public.products_search_vector();

-- -----------------------------------------------------------------------------
-- Variants
-- -----------------------------------------------------------------------------

create table public.product_variants (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid not null references public.products (id) on delete cascade,
  sku            text not null unique,              -- our internal SKU
  mpn            text,                              -- manufacturer part number
  ean            text,                              -- barcode, when known
  label          text,                              -- e.g. 'Black', '2 x 16 GB'
  -- Keys here override the product's specs for this variant only.
  specs_override jsonb not null default '{}'::jsonb check (jsonb_typeof(specs_override) = 'object'),
  is_default     boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index product_variants_product_idx on public.product_variants (product_id);
create unique index product_variants_one_default_idx
  on public.product_variants (product_id) where is_default;

create trigger product_variants_updated_at before update on public.product_variants
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Offers and price history
-- -----------------------------------------------------------------------------

create table public.offers (
  id                 uuid primary key default gen_random_uuid(),
  variant_id         uuid not null references public.product_variants (id) on delete cascade,
  retailer_id        uuid not null references public.retailers (id) on delete cascade,
  region_code        char(2) not null references public.regions (code) on delete cascade,
  currency_code      char(3) not null references public.currencies (code),
  price              numeric(12, 2) not null check (price >= 0),
  price_includes_tax boolean not null default true,
  -- Null means "use the retailer's regional default".
  shipping_cost      numeric(12, 2) check (shipping_cost >= 0),
  stock_status       public.stock_status not null default 'unknown',
  listing_type       public.listing_type not null default 'retail',
  url                text,
  delivery_days_min  smallint check (delivery_days_min >= 0),
  delivery_days_max  smallint check (delivery_days_max >= 0),
  is_active          boolean not null default true,
  last_checked_at    timestamptz not null default now(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint offers_unique unique (variant_id, retailer_id, region_code, listing_type),
  constraint offers_delivery check (
    delivery_days_min is null or delivery_days_max is null or delivery_days_max >= delivery_days_min
  )
);

create index offers_region_variant_idx on public.offers (region_code, variant_id) where is_active;
create index offers_retailer_idx on public.offers (retailer_id);

create trigger offers_updated_at before update on public.offers
  for each row execute function public.set_updated_at();

create table public.price_history (
  id            bigint generated always as identity primary key,
  offer_id      uuid not null references public.offers (id) on delete cascade,
  price         numeric(12, 2) not null check (price >= 0),
  currency_code char(3) not null references public.currencies (code),
  stock_status  public.stock_status not null,
  recorded_at   timestamptz not null default now()
);

create index price_history_offer_idx on public.price_history (offer_id, recorded_at desc);

-- Record a history point whenever an offer is created or its price or stock
-- status changes, so the price trend never depends on callers remembering.
create or replace function public.offers_record_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT'
     or new.price is distinct from old.price
     or new.stock_status is distinct from old.stock_status
     or new.currency_code is distinct from old.currency_code then
    insert into public.price_history (offer_id, price, currency_code, stock_status, recorded_at)
    values (new.id, new.price, new.currency_code, new.stock_status, coalesce(new.last_checked_at, now()));
  end if;
  return new;
end;
$$;

create trigger offers_record_history_trg
  after insert or update of price, stock_status, currency_code on public.offers
  for each row execute function public.offers_record_history();

-- Cheapest active offer and availability per variant and region.
-- security_invoker so the caller's RLS applies to the underlying tables.
create view public.variant_region_prices
with (security_invoker = true)
as
select
  o.variant_id,
  o.region_code,
  o.currency_code,
  min(o.price) filter (where o.stock_status in ('in_stock', 'low_stock')) as min_in_stock_price,
  min(o.price) as min_price,
  max(o.price) as max_price,
  count(*) as offer_count,
  count(*) filter (where o.stock_status in ('in_stock', 'low_stock')) as in_stock_count,
  bool_or(o.listing_type = 'retail') as has_retail_offer,
  max(o.last_checked_at) as last_checked_at
from public.offers o
join public.retailers r on r.id = o.retailer_id and r.is_active
where o.is_active
group by o.variant_id, o.region_code, o.currency_code;

-- -----------------------------------------------------------------------------
-- Benchmarks
-- -----------------------------------------------------------------------------

create table public.benchmarks (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products (id) on delete cascade,
  suite       text not null,                     -- e.g. 'Cinebench 2024 Multi', '3DMark Time Spy'
  workload    public.use_case not null,
  score       numeric(12, 2) not null,
  unit        text not null default 'points',
  higher_is_better boolean not null default true,
  source_name text,
  source_url  text,
  measured_at date,
  created_at  timestamptz not null default now(),
  constraint benchmarks_unique unique (product_id, suite)
);

-- -----------------------------------------------------------------------------
-- Compatibility rules
-- -----------------------------------------------------------------------------
-- The engine (src/lib/compatibility) implements each rule `code` in code;
-- this table lets admins enable/disable rules, change severity, tune
-- parameters (e.g. PSU headroom) and edit the user-facing text.

create table public.compatibility_rules (
  code          text primary key check (code ~ '^[a-z0-9_.]+$'),
  name          text not null,
  description   text not null,
  severity      public.rule_severity not null default 'error',
  -- The categories a rule involves, for display and filtering.
  categories    text[] not null default '{}',
  params        jsonb not null default '{}'::jsonb check (jsonb_typeof(params) = 'object'),
  is_active     boolean not null default true,
  updated_by    uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger compatibility_rules_updated_at before update on public.compatibility_rules
  for each row execute function public.set_updated_at();
