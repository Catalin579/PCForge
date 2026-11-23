import "server-only";

import { cache } from "react";

import {
  convert,
  money,
  quoteOffer,
  rankQuotes,
  toDecimal,
  type ExchangeRate,
  type Money,
  type OfferQuote,
  type OfferRow,
  type PricingContext,
} from "@/lib/pricing";
import { type ResolvedRegion } from "@/lib/region/detect";
import { type Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

import { buildSpecQuery, PAGE_SIZE, type CatalogParams } from "./filters";
import { isCategorySlug, type CategorySlug } from "./specs";

export class CatalogError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CatalogError";
  }
}

export type Category = {
  slug: CategorySlug;
  name: string;
  pluralName: string;
  description: string | null;
  icon: string | null;
  isCore: boolean;
  maxPerBuild: number | null;
};

export const getCategories = cache(async (): Promise<Category[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("slug, name, plural_name, description, icon, is_core, max_per_build")
    .order("sort_order");
  if (error) throw new CatalogError(error.message);
  return (data ?? [])
    .filter((c) => isCategorySlug(c.slug))
    .map((c) => ({
      slug: c.slug as CategorySlug,
      name: c.name,
      pluralName: c.plural_name,
      description: c.description,
      icon: c.icon,
      isCore: c.is_core,
      maxPerBuild: c.max_per_build,
    }));
});

export const getCategory = cache(
  async (slug: string) => (await getCategories()).find((c) => c.slug === slug) ?? null,
);

/** Everything the pricing service needs for one region, loaded once per request. */
export const getPricingContext = cache(
  async (regionCode: string, currency: string): Promise<PricingContext> => {
    const supabase = await createClient();
    const [rates, taxes, retailerRegions] = await Promise.all([
      supabase.from("exchange_rates").select("base_currency, quote_currency, rate, valid_at"),
      supabase
        .from("tax_rules")
        .select("region_code, category_slug, rate, valid_from, valid_to")
        .eq("region_code", regionCode),
      supabase.from("retailer_regions").select("*").eq("region_code", regionCode),
    ]);
    for (const r of [rates, taxes, retailerRegions])
      if (r.error) throw new CatalogError(r.error.message);
    return {
      regionCode,
      displayCurrency: currency,
      at: new Date(),
      rates: (rates.data ?? []).map(toRate),
      taxRules: (taxes.data ?? []).map((t) => ({
        regionCode: t.region_code,
        categorySlug: t.category_slug,
        rate: Number(t.rate),
        validFrom: t.valid_from,
        validTo: t.valid_to,
      })),
      retailerRegions: (retailerRegions.data ?? []).map((r) => ({
        retailerId: r.retailer_id,
        regionCode: r.region_code,
        currencyCode: r.currency_code,
        shippingCost: r.shipping_cost,
        freeShippingOver: r.free_shipping_over,
        deliveryDaysMin: r.delivery_days_min,
        deliveryDaysMax: r.delivery_days_max,
        isActive: r.is_active,
      })),
    };
  },
);

function toRate(r: {
  base_currency: string;
  quote_currency: string;
  rate: number;
  valid_at: string;
}): ExchangeRate {
  return {
    base: r.base_currency,
    quote: r.quote_currency,
    rate: Number(r.rate),
    validAt: r.valid_at,
  };
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export type ProductCard = {
  id: string;
  slug: string;
  name: string;
  category: CategorySlug;
  brandName: string;
  imageUrl: string | null;
  specs: Record<string, unknown>;
  performanceScore: number | null;
  defaultVariantId: string | null;
  /** Cheapest offer, converted to the display currency. Null if no offers. */
  fromPrice: Money | null;
  offerCount: number;
  inStockCount: number;
  averageRating: number | null;
  reviewCount: number;
};

export type SearchResult = {
  items: ProductCard[];
  total: number;
  page: number;
  pageCount: number;
};

export async function searchProducts(
  category: CategorySlug | null,
  params: CatalogParams,
  region: ResolvedRegion,
): Promise<SearchResult> {
  const supabase = await createClient();
  const ctx = await getPricingContext(region.region.code, region.currency);
  const regionCurrency = region.region.defaultCurrency;

  // Price bounds are entered in the display currency; offers are stored in the region's.
  const toRegionCurrency = (v: number | undefined) =>
    v === undefined
      ? undefined
      : toDecimal(convert(money(v, region.currency), regionCurrency, ctx.rates, ctx.at));

  const spec = buildSpecQuery(category, params.specFilters);
  const page = params.page;
  const { data, error } = await supabase.rpc("search_products", {
    p_region: region.region.code,
    p_category: category ?? undefined,
    p_query: params.q ?? undefined,
    p_brands: params.brand.length ? params.brand : undefined,
    p_min_price: toRegionCurrency(params.minPrice),
    p_max_price: toRegionCurrency(params.maxPrice),
    p_in_stock: params.inStock === "true",
    p_retailer: params.retailer ?? undefined,
    p_specs: Object.keys(spec.specs).length ? (spec.specs as Json) : undefined,
    p_spec_any: Object.keys(spec.any).length ? spec.any : undefined,
    p_spec_ranges: Object.keys(spec.ranges).length ? spec.ranges : undefined,
    p_sort: params.sort ?? (params.q ? "relevance" : "performance"),
    p_limit: PAGE_SIZE,
    p_offset: (page - 1) * PAGE_SIZE,
  });
  if (error) throw new CatalogError(error.message);

  const rows = data ?? [];
  const total = Number(rows[0]?.total_count ?? 0);
  return {
    items: rows
      .filter((r) => isCategorySlug(r.category_slug))
      .map((r) => ({
        id: r.id,
        slug: r.slug,
        name: r.name,
        category: r.category_slug as CategorySlug,
        brandName: r.brand_name,
        imageUrl: r.image_urls?.[0] ?? null,
        specs: (r.specs ?? {}) as Record<string, unknown>,
        performanceScore: r.performance_score,
        defaultVariantId: r.default_variant_id,
        fromPrice:
          r.min_price === null || r.currency_code === null
            ? null
            : convert(money(r.min_price, r.currency_code), region.currency, ctx.rates, ctx.at),
        offerCount: r.offer_count,
        inStockCount: r.in_stock_count,
        averageRating: r.average_rating === null ? null : Number(r.average_rating),
        reviewCount: r.review_count,
      })),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export const getBrandsForCategory = cache(async (category: CategorySlug) => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("category_brands", { p_category: category });
  if (error) throw new CatalogError(error.message);
  return (data ?? []).map((b) => ({ slug: b.slug, name: b.name, count: Number(b.product_count) }));
});

export const getRetailersForRegion = cache(async (regionCode: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("retailers")
    .select("id, slug, name, website_url, is_marketplace, retailer_regions!inner(region_code)")
    .eq("retailer_regions.region_code", regionCode)
    .order("name");
  if (error) throw new CatalogError(error.message);
  return (data ?? []).map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    websiteUrl: r.website_url,
    isMarketplace: r.is_marketplace,
  }));
});

// ---------------------------------------------------------------------------
// Product detail
// ---------------------------------------------------------------------------

export type ProductDetail = {
  id: string;
  slug: string;
  name: string;
  model: string;
  description: string | null;
  category: CategorySlug;
  brand: { slug: string; name: string; websiteUrl: string | null };
  imageUrls: string[];
  specs: Record<string, unknown>;
  powerDrawW: number | null;
  performanceScore: number | null;
  releaseDate: string | null;
  variants: Array<{
    id: string;
    sku: string;
    mpn: string | null;
    label: string | null;
    isDefault: boolean;
    specs: Record<string, unknown>;
  }>;
  rating: { average: number | null; count: number };
};

export const getProductBySlug = cache(async (slug: string): Promise<ProductDetail | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, slug, name, model, description, category_slug, image_urls, specs, power_draw_w, performance_score, release_date, brands(slug, name, website_url), product_variants(id, sku, mpn, label, is_default, specs_override)",
    )
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new CatalogError(error.message);
  if (!data || !isCategorySlug(data.category_slug)) return null;

  const { data: rating } = await supabase
    .from("product_rating_summaries")
    .select("average_rating, review_count")
    .eq("product_id", data.id)
    .maybeSingle();

  const specs = (data.specs ?? {}) as Record<string, unknown>;
  return {
    id: data.id,
    slug: data.slug,
    name: data.name,
    model: data.model,
    description: data.description,
    category: data.category_slug,
    brand: { slug: data.brands.slug, name: data.brands.name, websiteUrl: data.brands.website_url },
    imageUrls: data.image_urls ?? [],
    specs,
    powerDrawW: data.power_draw_w,
    performanceScore: data.performance_score,
    releaseDate: data.release_date,
    variants: [...data.product_variants]
      .sort((a, b) => Number(b.is_default) - Number(a.is_default))
      .map((v) => ({
        id: v.id,
        sku: v.sku,
        mpn: v.mpn,
        label: v.label,
        isDefault: v.is_default,
        specs: { ...specs, ...((v.specs_override ?? {}) as Record<string, unknown>) },
      })),
    rating: { average: rating?.average_rating ?? null, count: rating?.review_count ?? 0 },
  };
});

export type RetailerOffer = OfferQuote & {
  retailer: { id: string; slug: string; name: string; websiteUrl: string };
  link: string | null;
};

/** Offers for one variant in the region, quoted in the display currency and ranked best first. */
export async function getVariantOffers(
  variantId: string,
  category: CategorySlug,
  region: ResolvedRegion,
): Promise<RetailerOffer[]> {
  const supabase = await createClient();
  const ctx = await getPricingContext(region.region.code, region.currency);
  const { data, error } = await supabase
    .from("offers")
    .select("*, retailers(id, slug, name, website_url)")
    .eq("variant_id", variantId)
    .eq("region_code", region.region.code)
    .eq("is_active", true);
  if (error) throw new CatalogError(error.message);

  const byId = new Map((data ?? []).map((o) => [o.id, o]));
  const quotes = (data ?? []).map((o) => quoteOffer(toOfferRow(o), category, ctx));
  return rankQuotes(quotes).map((q) => {
    const row = byId.get(q.offer.id)!;
    return {
      ...q,
      retailer: {
        id: row.retailers.id,
        slug: row.retailers.slug,
        name: row.retailers.name,
        websiteUrl: row.retailers.website_url,
      },
      link: safeExternalUrl(row.url) ?? safeExternalUrl(row.retailers.website_url),
    };
  });
}

export type PricePoint = { date: string; min: number; currency: string };

/** Daily lowest price across the variant's offers in the region, oldest first. */
export async function getPriceHistory(
  variantId: string,
  region: ResolvedRegion,
  days = 90,
): Promise<PricePoint[]> {
  const supabase = await createClient();
  const ctx = await getPricingContext(region.region.code, region.currency);
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from("price_history")
    .select("price, currency_code, recorded_at, offers!inner(variant_id, region_code)")
    .eq("offers.variant_id", variantId)
    .eq("offers.region_code", region.region.code)
    .gte("recorded_at", since)
    .order("recorded_at");
  if (error) throw new CatalogError(error.message);

  const byDay = new Map<string, number>();
  for (const p of data ?? []) {
    const day = p.recorded_at.slice(0, 10);
    const amount = convert(
      money(p.price, p.currency_code),
      region.currency,
      ctx.rates,
      ctx.at,
    ).amount;
    byDay.set(day, Math.min(byDay.get(day) ?? Infinity, amount));
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, min]) => ({ date, min, currency: region.currency }));
}

/** Similar products in the same category, closest performance first. */
export async function getAlternatives(product: ProductDetail, region: ResolvedRegion, limit = 4) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_products", {
    p_region: region.region.code,
    p_category: product.category,
    p_sort: "performance",
    p_limit: 100,
  });
  if (error) throw new CatalogError(error.message);
  const ctx = await getPricingContext(region.region.code, region.currency);
  const score = product.performanceScore ?? 50;
  return (data ?? [])
    .filter((r) => r.id !== product.id && r.offer_count > 0)
    .sort(
      (a, b) =>
        Math.abs((a.performance_score ?? 50) - score) -
        Math.abs((b.performance_score ?? 50) - score),
    )
    .slice(0, limit)
    .map((r) => ({
      slug: r.slug,
      name: r.name,
      brandName: r.brand_name,
      performanceScore: r.performance_score,
      fromPrice:
        r.min_price === null || r.currency_code === null
          ? null
          : convert(money(r.min_price, r.currency_code), region.currency, ctx.rates, ctx.at),
    }));
}

export function toOfferRow(o: {
  id: string;
  variant_id: string;
  retailer_id: string;
  region_code: string;
  currency_code: string;
  price: number;
  price_includes_tax: boolean;
  shipping_cost: number | null;
  stock_status: OfferRow["stockStatus"];
  listing_type: OfferRow["listingType"];
  url: string | null;
  delivery_days_min: number | null;
  delivery_days_max: number | null;
  is_active: boolean;
}): OfferRow {
  return {
    id: o.id,
    variantId: o.variant_id,
    retailerId: o.retailer_id,
    regionCode: o.region_code,
    currencyCode: o.currency_code,
    price: o.price,
    priceIncludesTax: o.price_includes_tax,
    shippingCost: o.shipping_cost,
    stockStatus: o.stock_status,
    listingType: o.listing_type,
    url: o.url,
    deliveryDaysMin: o.delivery_days_min,
    deliveryDaysMax: o.delivery_days_max,
    isActive: o.is_active,
  };
}

/** Only allow http(s) links out of the site; anything else (javascript:, data:) is dropped. */
export function safeExternalUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}
