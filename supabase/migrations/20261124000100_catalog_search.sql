-- =============================================================================
-- PCForge: catalog search
-- =============================================================================
-- One RPC that the catalog pages call. Filtering, price aggregation and
-- paging happen in the database so the app never loads the whole catalog.
-- SECURITY INVOKER (default): RLS on products/offers still applies.

create or replace function public.search_products(
  p_region        char(2),
  p_category      text default null,
  p_query         text default null,
  p_brands        text[] default null,            -- brand slugs
  p_min_price     numeric default null,           -- in the region's default currency
  p_max_price     numeric default null,
  p_in_stock      boolean default false,          -- only products with an in-stock offer
  p_retailer      text default null,              -- retailer slug
  p_specs         jsonb default null,             -- containment: {"socket":"AM5"}, {"sockets":["AM5"]}
  p_spec_any      jsonb default null,             -- one of: {"type":["DDR4","DDR5"]}
  p_spec_ranges   jsonb default null,             -- {"wattage":{"min":750}, "connectors.pcie8pin":{"min":2}}
  p_sort          text default 'relevance',       -- relevance | price_asc | price_desc | performance | newest | name
  p_limit         integer default 24,
  p_offset        integer default 0
)
returns table (
  id                uuid,
  slug              text,
  name              text,
  category_slug     text,
  brand_slug        text,
  brand_name        text,
  image_urls        text[],
  specs             jsonb,
  performance_score smallint,
  power_draw_w      integer,
  release_date      date,
  default_variant_id uuid,
  min_price         numeric,
  currency_code     char(3),
  offer_count       integer,
  in_stock_count    integer,
  average_rating    numeric,
  review_count      integer,
  rank              real,
  total_count       bigint
)
language sql
stable
set search_path = public, extensions
as $$
  with q as (
    select case
      when p_query is null or btrim(p_query) = '' then null
      else websearch_to_tsquery('simple', p_query)
    end as tsq,
    nullif(btrim(coalesce(p_query, '')), '') as raw
  ),
  offer_stats as (
    select v.product_id,
           min(o.price) filter (where p_retailer is null or r.slug = p_retailer) as min_price,
           min(o.currency_code) as currency_code,
           count(*) filter (where p_retailer is null or r.slug = p_retailer)::int as offer_count,
           count(*) filter (
             where o.stock_status in ('in_stock', 'low_stock') and (p_retailer is null or r.slug = p_retailer)
           )::int as in_stock_count
    from offers o
    join product_variants v on v.id = o.variant_id
    join retailers r on r.id = o.retailer_id and r.is_active
    where o.region_code = p_region and o.is_active
    group by v.product_id
  ),
  matched as (
    select p.*, b.slug as b_slug, b.name as b_name, s.min_price, s.currency_code, s.offer_count, s.in_stock_count,
           case
             when (select tsq from q) is not null then ts_rank(p.search_vector, (select tsq from q))
             when (select raw from q) is not null then similarity(p.name, (select raw from q))
             else 0
           end::real as rank
    from products p
    join brands b on b.id = p.brand_id
    left join offer_stats s on s.product_id = p.id
    where p.status = 'published'
      and (p_category is null or p.category_slug = p_category)
      and (
        (select raw from q) is null
        or p.search_vector @@ (select tsq from q)
        or p.name % (select raw from q)
        or p.name ilike '%' || (select raw from q) || '%'
      )
      and (p_brands is null or cardinality(p_brands) = 0 or b.slug = any(p_brands))
      and (p_min_price is null or s.min_price >= p_min_price)
      and (p_max_price is null or s.min_price <= p_max_price)
      and (not p_in_stock or coalesce(s.in_stock_count, 0) > 0)
      and (p_retailer is null or coalesce(s.offer_count, 0) > 0)
      and (p_specs is null or p.specs @> p_specs)
      and (
        p_spec_any is null or not exists (
          select 1 from jsonb_each(p_spec_any) f
          where not (
            (p.specs #>> string_to_array(f.key, '.')) in (select jsonb_array_elements_text(f.value))
          )
        )
      )
      and (
        p_spec_ranges is null or not exists (
          select 1 from jsonb_each(p_spec_ranges) f
          where (p.specs #>> string_to_array(f.key, '.')) is null
             or (p.specs #>> string_to_array(f.key, '.'))::numeric < coalesce((f.value ->> 'min')::numeric, '-infinity'::numeric)
             or (p.specs #>> string_to_array(f.key, '.'))::numeric > coalesce((f.value ->> 'max')::numeric, 'infinity'::numeric)
        )
      )
  )
  select m.id, m.slug, m.name, m.category_slug, m.b_slug, m.b_name, m.image_urls, m.specs,
         m.performance_score, m.power_draw_w, m.release_date,
         (select v.id from product_variants v where v.product_id = m.id order by v.is_default desc, v.created_at limit 1),
         m.min_price, m.currency_code, coalesce(m.offer_count, 0), coalesce(m.in_stock_count, 0),
         rs.average_rating, coalesce(rs.review_count, 0),
         m.rank,
         count(*) over ()
  from matched m
  left join product_rating_summaries rs on rs.product_id = m.id
  order by
    case when p_sort = 'price_asc' then m.min_price end asc nulls last,
    case when p_sort = 'price_desc' then m.min_price end desc nulls last,
    case when p_sort = 'performance' then m.performance_score end desc nulls last,
    case when p_sort = 'newest' then m.release_date end desc nulls last,
    case when p_sort = 'name' then m.name end asc,
    case when p_sort = 'relevance' then m.rank end desc,
    -- Default tiebreak: in stock first, then performance, then name.
    (coalesce(m.in_stock_count, 0) > 0) desc,
    m.performance_score desc nulls last,
    m.name asc
  limit least(greatest(p_limit, 1), 100)
  offset greatest(p_offset, 0);
$$;

comment on function public.search_products is
  'Catalog search with regional prices. Spec filters use keys from src/lib/catalog/specs.ts; dotted keys address nested specs.';

grant execute on function public.search_products to anon, authenticated;

-- Brands that have published products in a category (for filter lists).
create or replace function public.category_brands(p_category text)
returns table (slug text, name text, product_count bigint)
language sql
stable
set search_path = public
as $$
  select b.slug, b.name, count(*)
  from products p join brands b on b.id = p.brand_id
  where p.status = 'published' and (p_category is null or p.category_slug = p_category)
  group by b.slug, b.name
  order by b.name;
$$;

grant execute on function public.category_brands to anon, authenticated;
