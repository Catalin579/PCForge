-- =============================================================================
-- PCForge: integrity triggers and Row Level Security
-- =============================================================================
-- Model:
--   * Catalog and reference data: readable by everyone (published/active rows
--     only), writable by admins only.
--   * User data: each user reads and writes their own rows; builds are
--     readable by anyone when public or unlisted (unlisted = link only).
--   * The service role (server jobs, seed) bypasses RLS as usual.

-- -----------------------------------------------------------------------------
-- Integrity: build_items.category_slug always matches the variant's product
-- -----------------------------------------------------------------------------

create or replace function public.build_items_set_category()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select p.category_slug into new.category_slug
  from public.product_variants v
  join public.products p on p.id = v.product_id
  where v.id = new.variant_id;

  if new.category_slug is null then
    raise exception 'Unknown product variant %', new.variant_id using errcode = '23503';
  end if;
  return new;
end;
$$;

create trigger build_items_set_category_trg
  before insert or update of variant_id on public.build_items
  for each row execute function public.build_items_set_category();

-- A selected offer must be for the same variant and the build's region.
create or replace function public.build_items_check_offer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.selected_offer_id is not null and not exists (
    select 1
    from public.offers o
    join public.builds b on b.id = new.build_id
    where o.id = new.selected_offer_id
      and o.variant_id = new.variant_id
      and o.region_code = b.region_code
  ) then
    raise exception 'Selected offer does not match this item''s variant and the build''s region'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger build_items_check_offer_trg
  before insert or update of selected_offer_id, variant_id on public.build_items
  for each row execute function public.build_items_check_offer();

-- -----------------------------------------------------------------------------
-- Helper: can the current user see a build?
-- -----------------------------------------------------------------------------

create or replace function public.can_view_build(p_build_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.builds b
    where b.id = p_build_id
      and (b.visibility in ('public', 'unlisted') or b.owner_id = (select auth.uid()))
  ) or public.is_admin();
$$;

create or replace function public.owns_build(p_build_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.builds b
    where b.id = p_build_id and b.owner_id = (select auth.uid())
  );
$$;

-- -----------------------------------------------------------------------------
-- Enable RLS everywhere
-- -----------------------------------------------------------------------------

alter table public.currencies          enable row level security;
alter table public.exchange_rates      enable row level security;
alter table public.regions             enable row level security;
alter table public.region_currencies   enable row level security;
alter table public.categories          enable row level security;
alter table public.brands              enable row level security;
alter table public.tax_rules           enable row level security;
alter table public.retailers           enable row level security;
alter table public.retailer_regions    enable row level security;
alter table public.products            enable row level security;
alter table public.product_variants    enable row level security;
alter table public.offers              enable row level security;
alter table public.price_history       enable row level security;
alter table public.benchmarks          enable row level security;
alter table public.compatibility_rules enable row level security;
alter table public.profiles            enable row level security;
alter table public.builds              enable row level security;
alter table public.build_items         enable row level security;
alter table public.build_comments      enable row level security;
alter table public.build_ratings       enable row level security;
alter table public.reviews             enable row level security;
alter table public.favorites           enable row level security;
alter table public.alerts              enable row level security;
alter table public.submissions         enable row level security;
alter table public.search_events       enable row level security;

-- -----------------------------------------------------------------------------
-- Reference and catalog data: public read, admin write
-- -----------------------------------------------------------------------------

-- Tables that are fully public to read.
do $$
declare
  t text;
begin
  foreach t in array array[
    'currencies', 'exchange_rates', 'region_currencies', 'categories', 'brands',
    'tax_rules', 'benchmarks', 'compatibility_rules'
  ] loop
    execute format(
      'create policy "%1$s: public read" on public.%1$I for select to anon, authenticated using (true)', t);
    execute format(
      'create policy "%1$s: admin write" on public.%1$I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end;
$$;

create policy "regions: public read active" on public.regions
  for select to anon, authenticated using (is_active or public.is_admin());
create policy "regions: admin write" on public.regions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "retailers: public read active" on public.retailers
  for select to anon, authenticated using (is_active or public.is_admin());
create policy "retailers: admin write" on public.retailers
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "retailer_regions: public read active" on public.retailer_regions
  for select to anon, authenticated using (is_active or public.is_admin());
create policy "retailer_regions: admin write" on public.retailer_regions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "products: public read published" on public.products
  for select to anon, authenticated using (status = 'published' or public.is_admin());
create policy "products: admin write" on public.products
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "product_variants: public read published" on public.product_variants
  for select to anon, authenticated using (
    public.is_admin() or exists (
      select 1 from public.products p where p.id = product_id and p.status = 'published'
    )
  );
create policy "product_variants: admin write" on public.product_variants
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "offers: public read active" on public.offers
  for select to anon, authenticated using (is_active or public.is_admin());
create policy "offers: admin write" on public.offers
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "price_history: public read" on public.price_history
  for select to anon, authenticated using (true);
create policy "price_history: admin write" on public.price_history
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- Profiles
-- -----------------------------------------------------------------------------

-- Profiles are public (usernames and display names appear on shared builds
-- and reviews). Preferences are not sensitive; no emails are stored here.
create policy "profiles: public read" on public.profiles
  for select to anon, authenticated using (true);
create policy "profiles: update own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or public.is_admin())
  with check (id = (select auth.uid()) or public.is_admin());

-- -----------------------------------------------------------------------------
-- Builds
-- -----------------------------------------------------------------------------

create policy "builds: read visible" on public.builds
  for select to anon, authenticated
  using (visibility in ('public', 'unlisted') or owner_id = (select auth.uid()) or public.is_admin());
create policy "builds: insert own" on public.builds
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "builds: update own" on public.builds
  for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "builds: delete own or admin" on public.builds
  for delete to authenticated using (owner_id = (select auth.uid()) or public.is_admin());

create policy "build_items: read with build" on public.build_items
  for select to anon, authenticated using (public.can_view_build(build_id));
create policy "build_items: write own build" on public.build_items
  for all to authenticated
  using (public.owns_build(build_id)) with check (public.owns_build(build_id));

create policy "build_comments: read visible" on public.build_comments
  for select to anon, authenticated
  using (public.can_view_build(build_id) and (not is_hidden or author_id = (select auth.uid()) or public.is_admin()));
create policy "build_comments: insert own on public builds" on public.build_comments
  for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and exists (select 1 from public.builds b where b.id = build_id and b.visibility = 'public')
  );
create policy "build_comments: update own" on public.build_comments
  for update to authenticated
  using (author_id = (select auth.uid()) or public.is_admin())
  with check (author_id = (select auth.uid()) or public.is_admin());
create policy "build_comments: delete own, build owner or admin" on public.build_comments
  for delete to authenticated
  using (author_id = (select auth.uid()) or public.owns_build(build_id) or public.is_admin());

create policy "build_ratings: read visible" on public.build_ratings
  for select to anon, authenticated using (public.can_view_build(build_id));
create policy "build_ratings: write own on others' public builds" on public.build_ratings
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.builds b
      where b.id = build_id and b.visibility = 'public' and b.owner_id <> (select auth.uid())
    )
  );
create policy "build_ratings: update own" on public.build_ratings
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "build_ratings: delete own" on public.build_ratings
  for delete to authenticated using (user_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- Reviews, favourites, alerts
-- -----------------------------------------------------------------------------

create policy "reviews: public read" on public.reviews
  for select to anon, authenticated
  using (not is_hidden or author_id = (select auth.uid()) or public.is_admin());
create policy "reviews: insert own" on public.reviews
  for insert to authenticated with check (author_id = (select auth.uid()) and not is_hidden);
create policy "reviews: update own" on public.reviews
  for update to authenticated
  using (author_id = (select auth.uid()) or public.is_admin())
  with check (author_id = (select auth.uid()) or public.is_admin());
create policy "reviews: delete own or admin" on public.reviews
  for delete to authenticated using (author_id = (select auth.uid()) or public.is_admin());

create policy "favorites: own" on public.favorites
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "alerts: own" on public.alerts
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- Submissions and analytics
-- -----------------------------------------------------------------------------

create policy "submissions: read own or admin" on public.submissions
  for select to authenticated using (submitted_by = (select auth.uid()) or public.is_admin());
create policy "submissions: insert own pending" on public.submissions
  for insert to authenticated
  with check (submitted_by = (select auth.uid()) and status = 'pending' and reviewed_by is null);
create policy "submissions: admin review" on public.submissions
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Search logging goes through the server (service role); only admins read.
create policy "search_events: admin read" on public.search_events
  for select to authenticated using (public.is_admin());
