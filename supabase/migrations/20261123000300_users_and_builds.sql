-- =============================================================================
-- PCForge: profiles, builds, reviews, favourites, alerts, submissions, analytics
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- -----------------------------------------------------------------------------

create table public.profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  username          extensions.citext unique check (username ~ '^[A-Za-z0-9_]{3,30}$'),
  display_name      text check (char_length(display_name) <= 80),
  avatar_url        text,
  bio               text check (char_length(bio) <= 500),
  role              public.user_role not null default 'user',
  region_code       char(2) references public.regions (code),
  currency_code     char(3) references public.currencies (code),
  locale            text,
  primary_use_case  public.use_case,
  budget_amount     numeric(12, 2) check (budget_amount >= 0),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Is the current user an admin? security definer so it can read profiles
-- without recursing through profiles' own RLS policies.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  );
$$;

-- Create a profile row for every new auth user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Only admins may change anyone's role (including their own). Direct database
-- sessions without a JWT (migrations, seed scripts, SQL editor) are allowed.
create or replace function public.profiles_protect_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is distinct from old.role
     and (select auth.uid()) is not null
     and not public.is_admin() then
    raise exception 'Only admins can change roles' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_role_trg
  before update of role on public.profiles
  for each row execute function public.profiles_protect_role();

-- -----------------------------------------------------------------------------
-- Builds
-- -----------------------------------------------------------------------------

create table public.builds (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references public.profiles (id) on delete cascade,
  name           text not null check (char_length(name) between 1 and 120),
  description    text check (char_length(description) <= 2000),
  region_code    char(2) not null references public.regions (code),
  currency_code  char(3) not null references public.currencies (code),
  use_case       public.use_case,
  budget_amount  numeric(12, 2) check (budget_amount >= 0),
  visibility     public.build_visibility not null default 'private',
  -- Short, unguessable id used in share URLs (/b/<share_slug>).
  share_slug     text not null unique default translate(encode(extensions.gen_random_bytes(9), 'base64'), '+/', '-_')
                 check (share_slug ~ '^[A-Za-z0-9_-]{8,32}$'),
  forked_from_id uuid references public.builds (id) on delete set null,
  -- Snapshot written by the server when saving, for list views and sharing.
  -- The live numbers are always recomputed from build_items + offers.
  total_price_snapshot numeric(12, 2),
  power_draw_snapshot  integer,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index builds_owner_idx on public.builds (owner_id, updated_at desc);
create index builds_public_idx on public.builds (visibility, updated_at desc) where visibility = 'public';

create trigger builds_updated_at before update on public.builds
  for each row execute function public.set_updated_at();

create table public.build_items (
  id           uuid primary key default gen_random_uuid(),
  build_id     uuid not null references public.builds (id) on delete cascade,
  variant_id   uuid not null references public.product_variants (id) on delete restrict,
  -- Denormalised from the product so the engine can group items cheaply.
  category_slug text not null references public.categories (slug),
  quantity     smallint not null default 1 check (quantity between 1 and 16),
  -- The offer the user picked; null means "cheapest available".
  selected_offer_id uuid references public.offers (id) on delete set null,
  position     smallint not null default 0,
  notes        text check (char_length(notes) <= 500),
  created_at   timestamptz not null default now()
);

create index build_items_build_idx on public.build_items (build_id, position);

create table public.build_comments (
  id          uuid primary key default gen_random_uuid(),
  build_id    uuid not null references public.builds (id) on delete cascade,
  author_id   uuid not null references public.profiles (id) on delete cascade,
  body        text not null check (char_length(body) between 1 and 2000),
  is_hidden   boolean not null default false,       -- moderation
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index build_comments_build_idx on public.build_comments (build_id, created_at);

create trigger build_comments_updated_at before update on public.build_comments
  for each row execute function public.set_updated_at();

create table public.build_ratings (
  build_id   uuid not null references public.builds (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  rating     smallint not null check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  primary key (build_id, user_id)
);

-- -----------------------------------------------------------------------------
-- Product reviews and favourites
-- -----------------------------------------------------------------------------

create table public.reviews (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products (id) on delete cascade,
  author_id   uuid not null references public.profiles (id) on delete cascade,
  rating      smallint not null check (rating between 1 and 5),
  title       text check (char_length(title) <= 120),
  body        text check (char_length(body) <= 5000),
  region_code char(2) references public.regions (code),
  is_hidden   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint reviews_one_per_user unique (product_id, author_id)
);

create index reviews_product_idx on public.reviews (product_id, created_at desc);

create trigger reviews_updated_at before update on public.reviews
  for each row execute function public.set_updated_at();

create view public.product_rating_summaries
with (security_invoker = true)
as
select product_id, count(*)::int as review_count, round(avg(rating)::numeric, 2) as average_rating
from public.reviews
where not is_hidden
group by product_id;

create table public.favorites (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

-- -----------------------------------------------------------------------------
-- Price and stock alerts
-- -----------------------------------------------------------------------------

create table public.alerts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles (id) on delete cascade,
  variant_id       uuid not null references public.product_variants (id) on delete cascade,
  region_code      char(2) not null references public.regions (code),
  type             public.alert_type not null,
  target_price     numeric(12, 2) check (target_price >= 0),
  currency_code    char(3) references public.currencies (code),
  is_active        boolean not null default true,
  last_notified_at timestamptz,
  created_at       timestamptz not null default now(),
  constraint alerts_price_target check (
    type <> 'price_drop' or (target_price is not null and currency_code is not null)
  ),
  constraint alerts_unique unique (user_id, variant_id, region_code, type)
);

create index alerts_active_idx on public.alerts (variant_id, region_code) where is_active;

-- -----------------------------------------------------------------------------
-- User submissions (new products, corrections, reports) for admin review
-- -----------------------------------------------------------------------------

create table public.submissions (
  id            uuid primary key default gen_random_uuid(),
  submitted_by  uuid not null references public.profiles (id) on delete cascade,
  kind          public.submission_kind not null,
  -- What it is about, when it is about something existing.
  product_id    uuid references public.products (id) on delete set null,
  offer_id      uuid references public.offers (id) on delete set null,
  build_id      uuid references public.builds (id) on delete set null,
  payload       jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  message       text check (char_length(message) <= 2000),
  status        public.submission_status not null default 'pending',
  reviewed_by   uuid references public.profiles (id) on delete set null,
  reviewed_at   timestamptz,
  review_note   text,
  created_at    timestamptz not null default now()
);

create index submissions_status_idx on public.submissions (status, created_at);

-- -----------------------------------------------------------------------------
-- Analytics events (search terms; more event types later)
-- -----------------------------------------------------------------------------

create table public.search_events (
  id            bigint generated always as identity primary key,
  query         text not null check (char_length(query) between 1 and 200),
  category_slug text references public.categories (slug) on delete set null,
  region_code   char(2) references public.regions (code) on delete set null,
  result_count  integer,
  user_id       uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now()
);

create index search_events_created_idx on public.search_events (created_at desc);
