-- Catalog search RPC checks. Run by scripts/verify-migrations.sh.
begin;
set local role anon;

do $$
declare
  r record;
begin
  -- Category + exact spec filter + price sort.
  select array_agg(name order by min_price) as names, count(*) as n, min(total_count) as total
    into r from public.search_products('RO', 'cpu', p_specs => '{"socket":"AM5"}', p_sort => 'price_asc');
  assert r.n = 5 and r.total = 5, 'expected 5 AM5 CPUs';

  -- Array containment (case supports a form factor).
  assert (select count(*) from public.search_products('DE', 'case', p_specs => '{"supportedMotherboards":["Mini-ITX"]}'))
       = (select count(*) from public.products where category_slug = 'case'),
    'every seeded case supports Mini-ITX';

  -- Nested range filter and "any of" filter.
  assert not exists (
    select 1 from public.search_products('DE', 'psu', p_spec_ranges => '{"connectors.12v2x6":{"min":1}}')
    where (specs #>> '{connectors,12v2x6}')::int < 1
  ), 'range filter on nested key';
  assert not exists (
    select 1 from public.search_products('DE', 'memory', p_spec_any => '{"type":["DDR4"]}') where specs ->> 'type' <> 'DDR4'
  ), 'any-of filter';

  -- Full-text and fuzzy search.
  assert exists (select 1 from public.search_products('RO', null, p_query => 'ryzen 7800x3d') where slug = 'amd-ryzen-7-7800x3d'),
    'full-text search finds 7800X3D';
  assert exists (select 1 from public.search_products('RO', null, p_query => 'samsng 990') where slug like 'samsung-990%'),
    'fuzzy search tolerates typos';

  -- Prices come from the requested region.
  select * into r from public.search_products('DE', null, p_query => 'Ryzen 7 7800X3D') limit 1;
  assert r.currency_code = 'EUR', 'DE prices in EUR';

  -- Price bounds, stock and paging.
  assert not exists (select 1 from public.search_products('RO', 'gpu', p_max_price => 2000) where min_price > 2000), 'max price';
  assert not exists (select 1 from public.search_products('RO', 'gpu', p_in_stock => true) where in_stock_count = 0), 'in stock';
  assert (select count(*) from public.search_products('RO', 'gpu', p_limit => 3, p_offset => 3)) = 3, 'paging';
  assert (select max(total_count) from public.search_products('RO', 'gpu', p_limit => 3)) = 10, 'total count ignores paging';

  assert (select count(*) from public.category_brands('gpu')) >= 5, 'brands per category';
end $$;

rollback;
