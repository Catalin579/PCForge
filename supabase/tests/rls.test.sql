-- Row Level Security and integrity checks. Run by scripts/verify-migrations.sh
-- after migrations and seed. Each block raises an exception on failure.
-- Everything happens inside a transaction that is rolled back.

begin;

-- Fixtures: two users and one admin.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-4000-8000-000000000001', 'alice@example.test', '{"full_name":"Alice"}'),
  ('00000000-0000-4000-8000-000000000002', 'bob@example.test', '{}'),
  ('00000000-0000-4000-8000-0000000000ad', 'admin@example.test', '{}');
update public.profiles set role = 'admin' where id = '00000000-0000-4000-8000-0000000000ad';

-- Seed sanity ------------------------------------------------------------------
do $$
begin
  assert (select count(*) from public.profiles) = 3, 'profile trigger should create a profile per user';
  assert (select display_name from public.profiles where id = '00000000-0000-4000-8000-000000000001') = 'Alice',
    'profile display name should come from auth metadata';
  assert (select count(*) from public.regions where is_active) = 2, 'expected two active regions';
  assert (select count(*) from public.products where status = 'published') >= 80, 'expected at least 80 products';
  assert not exists (
    select 1 from public.product_variants v
    where not exists (select 1 from public.offers o where o.variant_id = v.id and o.region_code = 'RO')
       or not exists (select 1 from public.offers o where o.variant_id = v.id and o.region_code = 'DE')
  ), 'every variant should have offers in both regions';
  assert not exists (
    select p.id from public.products p
    left join public.product_variants v on v.product_id = p.id and v.is_default
    group by p.id having count(v.id) <> 1
  ), 'every product should have exactly one default variant';
  assert (select count(*) from public.price_history) > (select count(*) from public.offers) * 10,
    'expected price history for offers';
  assert not exists (
    select 1 from public.offers o join public.regions r on r.code = o.region_code
    where o.currency_code <> r.default_currency
  ), 'seed offers should be priced in the region default currency';
  assert (select count(*) from public.products where search_vector @@ to_tsquery('simple', 'ryzen')) >= 5,
    'full-text search should find Ryzen CPUs';
end $$;

-- Price history trigger ----------------------------------------------------------
do $$
declare
  o uuid;
  before_count int;
begin
  select id into o from public.offers limit 1;
  select count(*) into before_count from public.price_history where offer_id = o;
  update public.offers set price = price + 1 where id = o;
  assert (select count(*) from public.price_history where offer_id = o) = before_count + 1,
    'price change should record history';
  update public.offers set url = url where id = o;
  assert (select count(*) from public.price_history where offer_id = o) = before_count + 1,
    'non-price update should not record history';
end $$;

-- Anonymous visitors ------------------------------------------------------------
set local role anon;
select set_config('request.jwt.claim.sub', '', true);

do $$
begin
  assert (select count(*) from public.products) > 0, 'anon can read published products';
  assert (select count(*) from public.offers) > 0, 'anon can read offers';
  assert (select count(*) from public.variant_region_prices) > 0, 'anon can read price summary view';
  assert (select count(*) from public.search_events) = 0, 'anon cannot read analytics';
  begin
    insert into public.brands (slug, name) values ('hacker', 'Hacker');
    raise exception 'anon should not insert brands';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Alice: builds, items, privacy ------------------------------------------------
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);

do $$
declare
  b_private uuid;
  b_public uuid;
  v uuid;
  wrong_offer uuid;
begin
  insert into public.builds (owner_id, name, region_code, currency_code, visibility)
  values ('00000000-0000-4000-8000-000000000001', 'Private build', 'RO', 'RON', 'private') returning id into b_private;
  insert into public.builds (owner_id, name, region_code, currency_code, visibility)
  values ('00000000-0000-4000-8000-000000000001', 'Public build', 'RO', 'RON', 'public') returning id into b_public;

  select v2.id into v from public.product_variants v2
  join public.products p on p.id = v2.product_id where p.slug = 'amd-ryzen-7-7800x3d';

  -- category_slug is derived from the variant, whatever the client sends.
  insert into public.build_items (build_id, variant_id, category_slug) values (b_private, v, 'gpu');
  assert (select category_slug from public.build_items where build_id = b_private) = 'cpu',
    'build item category should be derived from the product';

  -- An offer from another region is rejected.
  select o.id into wrong_offer from public.offers o where o.variant_id = v and o.region_code = 'DE' limit 1;
  begin
    insert into public.build_items (build_id, variant_id, category_slug, selected_offer_id)
    values (b_public, v, 'cpu', wrong_offer);
    raise exception 'offer from another region should be rejected';
  exception when check_violation then null;
  end;

  -- Alice cannot make herself admin.
  begin
    update public.profiles set role = 'admin' where id = '00000000-0000-4000-8000-000000000001';
    raise exception 'user should not be able to change role';
  exception when insufficient_privilege then null;
  end;

  -- Alice cannot create a build for Bob.
  begin
    insert into public.builds (owner_id, name, region_code, currency_code)
    values ('00000000-0000-4000-8000-000000000002', 'Not mine', 'RO', 'RON');
    raise exception 'user should not create builds for others';
  exception when insufficient_privilege then null;
  end;

  -- Alice cannot write catalog data.
  begin
    update public.offers set price = 1 where true;
    assert not found, 'user should not update offers';
  end;
end $$;

-- Bob: sees Alice's public build but not her private one ------------------------
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);

do $$
begin
  assert (select count(*) from public.builds where owner_id = '00000000-0000-4000-8000-000000000001') = 1,
    'Bob should only see Alice''s public build';
  assert (select count(*) from public.build_items) = 0,
    'Bob should not see items of Alice''s private build';
  update public.builds set name = 'Hijacked' where owner_id = '00000000-0000-4000-8000-000000000001';
  assert not found, 'Bob should not update Alice''s builds';

  -- Bob can rate and comment on Alice's public build.
  insert into public.build_ratings (build_id, user_id, rating)
  select id, '00000000-0000-4000-8000-000000000002', 5 from public.builds where visibility = 'public' limit 1;
  insert into public.build_comments (build_id, author_id, body)
  select id, '00000000-0000-4000-8000-000000000002', 'Nice build' from public.builds where visibility = 'public' limit 1;
end $$;

-- Admin --------------------------------------------------------------------------
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000ad', true);

do $$
begin
  update public.products set status = 'draft' where slug = 'amd-ryzen-5-5600';
  assert found, 'admin should update products';
  assert (select count(*) from public.builds) = 2, 'admin sees all builds';
end $$;

-- Draft products are hidden from the public again.
reset role;
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
do $$
begin
  assert not exists (select 1 from public.products where slug = 'amd-ryzen-5-5600'),
    'draft products should be hidden from anon';
end $$;

reset role;
rollback;
