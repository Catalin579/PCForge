-- =============================================================================
-- PCForge: reference data (markets, money, taxes, retailers, categories)
-- =============================================================================
-- Everything region- or price-specific lives in the database, never in code.
-- A "region" is a market (usually a country). Each region has a default
-- currency, locale and VAT rules, and a set of retailers that ship there.

create extension if not exists pg_trgm with schema extensions;
create extension if not exists citext with schema extensions;

-- -----------------------------------------------------------------------------
-- Shared helpers
-- -----------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------

create type public.user_role as enum ('user', 'admin');
create type public.stock_status as enum ('in_stock', 'low_stock', 'out_of_stock', 'preorder', 'backorder', 'unknown');
create type public.listing_type as enum ('retail', 'marketplace');
create type public.product_status as enum ('draft', 'published', 'archived');
create type public.build_visibility as enum ('private', 'unlisted', 'public');
create type public.use_case as enum ('gaming', 'productivity', 'streaming', 'content_creation', 'workstation', 'home_office');
create type public.rule_severity as enum ('error', 'warning', 'info');
create type public.alert_type as enum ('price_drop', 'back_in_stock');
create type public.submission_kind as enum ('new_product', 'correction', 'report');
create type public.submission_status as enum ('pending', 'approved', 'rejected');

-- -----------------------------------------------------------------------------
-- Currencies and exchange rates
-- -----------------------------------------------------------------------------

create table public.currencies (
  code        char(3) primary key check (code ~ '^[A-Z]{3}$'),
  name        text not null,
  symbol      text not null,
  -- Number of minor units (2 for EUR/RON, 0 for JPY). Used for rounding.
  minor_units smallint not null default 2 check (minor_units between 0 and 4),
  created_at  timestamptz not null default now()
);

comment on table public.currencies is 'ISO 4217 currencies the app can display prices in.';

-- One row per (base, quote, day). The pricing service uses the most recent
-- rate at or before the moment it converts.
create table public.exchange_rates (
  id             bigint generated always as identity primary key,
  base_currency  char(3) not null references public.currencies (code),
  quote_currency char(3) not null references public.currencies (code),
  rate           numeric(18, 8) not null check (rate > 0),
  source         text not null default 'manual',
  valid_at       timestamptz not null default now(),
  created_at     timestamptz not null default now(),
  constraint exchange_rates_distinct check (base_currency <> quote_currency),
  constraint exchange_rates_unique unique (base_currency, quote_currency, valid_at)
);

create index exchange_rates_lookup_idx
  on public.exchange_rates (base_currency, quote_currency, valid_at desc);

-- -----------------------------------------------------------------------------
-- Regions (markets)
-- -----------------------------------------------------------------------------

create table public.regions (
  code             char(2) primary key check (code ~ '^[A-Z]{2}$'), -- ISO 3166-1 alpha-2
  name             text not null,
  default_currency char(3) not null references public.currencies (code),
  default_locale   text not null,                  -- BCP 47, e.g. 'ro-RO'
  supported_locales text[] not null default '{}',
  -- Consumer prices in this market are quoted including VAT.
  prices_include_tax boolean not null default true,
  is_active        boolean not null default false,
  sort_order       smallint not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create trigger regions_updated_at before update on public.regions
  for each row execute function public.set_updated_at();

comment on table public.regions is 'Markets the catalog serves. Only active regions are offered to users.';

-- Which extra currencies a region lets the user switch to (besides its default).
create table public.region_currencies (
  region_code   char(2) not null references public.regions (code) on delete cascade,
  currency_code char(3) not null references public.currencies (code),
  primary key (region_code, currency_code)
);

-- -----------------------------------------------------------------------------
-- Categories and brands
-- -----------------------------------------------------------------------------

create table public.categories (
  slug        text primary key check (slug ~ '^[a-z0-9-]+$'),
  name        text not null,
  plural_name text not null,
  description text,
  icon        text,                                 -- Lucide icon name
  -- Core components make up a working PC; peripherals are optional.
  is_core     boolean not null default true,
  -- How many of this category a build may contain (null = unlimited).
  max_per_build smallint,
  sort_order  smallint not null default 0
);

create table public.brands (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name        text not null,
  website_url text,
  logo_url    text,
  created_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Tax rules
-- -----------------------------------------------------------------------------
-- A region's standard VAT rate has category_slug = null. A category-specific
-- row overrides it. Rules are dated so rate changes keep history.

create table public.tax_rules (
  id            uuid primary key default gen_random_uuid(),
  region_code   char(2) not null references public.regions (code) on delete cascade,
  category_slug text references public.categories (slug) on delete cascade,
  name          text not null,                      -- e.g. 'TVA standard'
  rate          numeric(6, 4) not null check (rate >= 0 and rate < 1), -- 0.2100 = 21 %
  valid_from    date not null,
  valid_to      date,
  created_at    timestamptz not null default now(),
  constraint tax_rules_dates check (valid_to is null or valid_to > valid_from)
);

create index tax_rules_region_idx on public.tax_rules (region_code, category_slug, valid_from desc);

-- -----------------------------------------------------------------------------
-- Retailers
-- -----------------------------------------------------------------------------

create table public.retailers (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name           text not null,
  website_url    text not null,
  logo_url       text,
  -- Optional: '{query}' is replaced with the URL-encoded product name when an
  -- offer has no direct product URL.
  search_url_template text,
  is_marketplace boolean not null default false,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create trigger retailers_updated_at before update on public.retailers
  for each row execute function public.set_updated_at();

-- Retailer presence in a market: shipping and delivery defaults per region.
create table public.retailer_regions (
  retailer_id           uuid not null references public.retailers (id) on delete cascade,
  region_code           char(2) not null references public.regions (code) on delete cascade,
  currency_code         char(3) not null references public.currencies (code),
  shipping_cost         numeric(12, 2) not null default 0 check (shipping_cost >= 0),
  free_shipping_over    numeric(12, 2) check (free_shipping_over >= 0),
  delivery_days_min     smallint check (delivery_days_min >= 0),
  delivery_days_max     smallint check (delivery_days_max >= 0),
  is_active             boolean not null default true,
  primary key (retailer_id, region_code),
  constraint retailer_regions_delivery check (
    delivery_days_min is null or delivery_days_max is null or delivery_days_max >= delivery_days_min
  )
);

create index retailer_regions_region_idx on public.retailer_regions (region_code);
