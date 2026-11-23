/**
 * Builds supabase/seed.sql from the typed data in supabase/seed/data.
 *
 *   pnpm db:seed:generate   write supabase/seed.sql
 *   pnpm db:seed            write it, then apply it to $DATABASE_URL
 *
 * `supabase db reset` also loads seed.sql automatically.
 *
 * Every id is derived from a stable key, and prices, stock and history come
 * from a seeded hash, so the output is identical on every run and safe to
 * re-apply (all inserts are upserts).
 */
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import path from "node:path";

import { specSchemas, type CategorySlug } from "../src/lib/catalog/specs";
import * as ref from "../supabase/seed/data/reference";
import {
  cases,
  caseFans,
  coolers,
  headsets,
  keyboards,
  mice,
  monitors,
} from "../supabase/seed/data/products-chassis";
import { cpus, memory, motherboards } from "../supabase/seed/data/products-platform";
import { gpus, psus, storage } from "../supabase/seed/data/products-power";
import type { SeedProduct } from "../supabase/seed/types";

export const SEED_AS_OF = new Date("2026-11-23T06:00:00Z");
const HISTORY_DAYS = 90;
const HISTORY_POINTS = 13;

// ---------------------------------------------------------------------------
// Deterministic helpers
// ---------------------------------------------------------------------------

export function stableUuid(key: string): string {
  const h = createHash("sha256").update(`pcforge:${key}`).digest("hex");
  // Shape it like a v4 UUID so it passes any uuid validation.
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-${((parseInt(h[16]!, 16) & 0x3) | 0x8).toString(16)}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

/** Uniform number in [0, 1) derived from a key. */
export function hash01(key: string): number {
  const h = createHash("sha256").update(key).digest();
  return h.readUInt32BE(0) / 0x1_0000_0000;
}

function sql(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error(`Non-finite number in seed: ${value}`);
    return String(value);
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  if (value instanceof Date) return `'${value.toISOString()}'`;
  if (Array.isArray(value) && value.every((v) => typeof v === "string")) {
    return `array[${value.map((v) => sql(v)).join(", ")}]::text[]`;
  }
  if (typeof value === "object") return `${sql(JSON.stringify(value))}::jsonb`;
  return `'${String(value).replace(/'/g, "''")}'`;
}

type Row = Record<string, unknown>;

function upsert(
  table: string,
  rows: Row[],
  conflict: string[],
  opts: { update?: boolean } = {},
): string {
  if (rows.length === 0) return "";
  const cols = Object.keys(rows[0]!);
  const values = rows.map((r) => `  (${cols.map((c) => sql(r[c])).join(", ")})`).join(",\n");
  const updatable = cols.filter((c) => !conflict.includes(c));
  const onConflict =
    opts.update === false || updatable.length === 0
      ? `on conflict (${conflict.join(", ")}) do nothing`
      : `on conflict (${conflict.join(", ")}) do update set\n  ${updatable.map((c) => `${c} = excluded.${c}`).join(",\n  ")}`;
  return `insert into public.${table} (${cols.join(", ")}) values\n${values}\n${onConflict};\n`;
}

// ---------------------------------------------------------------------------
// Pricing model for seed offers
// ---------------------------------------------------------------------------

const REGION_PRICE_FACTOR: Record<string, { currency: string; factor: number }> = {
  // RON prices: EUR reference x exchange rate, adjusted for 21 % vs 19 % VAT
  // and a small market premium.
  RO: { currency: "RON", factor: 5.09 * (1.21 / 1.19) * 1.01 },
  DE: { currency: "EUR", factor: 1 },
};

export function roundRetailPrice(amount: number, currency: string): number {
  if (currency === "RON") return Math.max(Math.round(amount) - 0.01, 0.99); // 1234.99 lei
  return Math.max(Math.round(amount) - 0.1, 0.9); // 123.90 €
}

function stockFor(key: string): string {
  const h = hash01(`stock:${key}`);
  if (h < 0.7) return "in_stock";
  if (h < 0.8) return "low_stock";
  if (h < 0.9) return "out_of_stock";
  if (h < 0.95) return "preorder";
  return "backorder";
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

export const allProducts: SeedProduct[] = [
  ...cpus,
  ...motherboards,
  ...memory,
  ...gpus,
  ...storage,
  ...psus,
  ...cases,
  ...coolers,
  ...caseFans,
  ...monitors,
  ...keyboards,
  ...mice,
  ...headsets,
] as SeedProduct[];

export function validateProducts(products: SeedProduct[]): void {
  const slugs = new Set<string>();
  for (const p of products) {
    if (slugs.has(p.slug)) throw new Error(`Duplicate product slug: ${p.slug}`);
    slugs.add(p.slug);
    if (!ref.brands.some(([slug]) => slug === p.brand))
      throw new Error(`${p.slug}: unknown brand ${p.brand}`);
    const schema = specSchemas[p.category as CategorySlug];
    const variants = p.variants ?? [{ key: "default", label: "" }];
    for (const v of variants) {
      const merged = { ...(p.specs as object), ...(v.specsOverride ?? {}) };
      const result = schema.safeParse(merged);
      if (!result.success) {
        throw new Error(`${p.slug}/${v.key}: invalid specs\n${result.error.message}`);
      }
    }
  }
}

export function buildSeedSql(): string {
  validateProducts(allProducts);
  const out: string[] = [];
  out.push(
    "-- =============================================================================",
    "-- PCForge seed data. GENERATED by scripts/generate-seed.ts. Do not edit by hand:",
    "-- change supabase/seed/data/*.ts and run `pnpm db:seed:generate`.",
    "-- Prices, stock and history are realistic but illustrative, not live data.",
    "-- =============================================================================",
    "",
    "begin;",
    "",
  );

  // Reference data ----------------------------------------------------------
  out.push(
    upsert(
      "currencies",
      ref.currencies.map((c) => ({
        code: c.code,
        name: c.name,
        symbol: c.symbol,
        minor_units: c.minorUnits,
      })),
      ["code"],
    ),
  );

  out.push(
    upsert(
      "exchange_rates",
      ref.exchangeRates.map((r) => ({
        base_currency: r.base,
        quote_currency: r.quote,
        rate: r.rate,
        source: r.source,
        valid_at: r.validAt,
      })),
      ["base_currency", "quote_currency", "valid_at"],
    ),
  );

  out.push(
    upsert(
      "regions",
      ref.regions.map((r) => ({
        code: r.code,
        name: r.name,
        default_currency: r.defaultCurrency,
        default_locale: r.defaultLocale,
        supported_locales: [...r.supportedLocales],
        prices_include_tax: true,
        is_active: true,
        sort_order: r.sortOrder,
      })),
      ["code"],
    ),
  );

  out.push(
    upsert(
      "region_currencies",
      ref.regions.flatMap((r) =>
        [r.defaultCurrency, ...r.extraCurrencies].map((c) => ({
          region_code: r.code,
          currency_code: c,
        })),
      ),
      ["region_code", "currency_code"],
      { update: false },
    ),
  );

  out.push(
    upsert(
      "categories",
      ref.categories.map((c, i) => ({
        slug: c.slug,
        name: c.name,
        plural_name: c.plural,
        description: c.description,
        icon: c.icon,
        is_core: c.isCore,
        max_per_build: c.max,
        sort_order: i + 1,
      })),
      ["slug"],
    ),
  );

  out.push(
    upsert(
      "tax_rules",
      ref.taxRules.map((t) => ({
        id: stableUuid(`tax:${t.region}:${t.validFrom}`),
        region_code: t.region,
        category_slug: null,
        name: t.name,
        rate: t.rate,
        valid_from: t.validFrom,
        valid_to: t.validTo,
      })),
      ["id"],
    ),
  );

  out.push(
    upsert(
      "brands",
      ref.brands.map(([slug, name, url]) => ({
        id: stableUuid(`brand:${slug}`),
        slug,
        name,
        website_url: url,
      })),
      ["id"],
    ),
  );

  out.push(
    upsert(
      "retailers",
      ref.retailers.map((r) => ({
        id: stableUuid(`retailer:${r.slug}`),
        slug: r.slug,
        name: r.name,
        website_url: r.websiteUrl,
        search_url_template: r.searchUrlTemplate,
        is_marketplace: r.isMarketplace,
        is_active: true,
      })),
      ["id"],
    ),
  );

  out.push(
    upsert(
      "retailer_regions",
      ref.retailers.flatMap((r) =>
        r.regions.map((rr) => ({
          retailer_id: stableUuid(`retailer:${r.slug}`),
          region_code: rr.region,
          currency_code: rr.currency,
          shipping_cost: rr.shipping,
          free_shipping_over: rr.freeOver,
          delivery_days_min: rr.days[0],
          delivery_days_max: rr.days[1],
          is_active: true,
        })),
      ),
      ["retailer_id", "region_code"],
    ),
  );

  out.push(
    upsert(
      "compatibility_rules",
      ref.compatibilityRules.map((r) => ({
        code: r.code,
        name: r.name,
        description: r.description,
        severity: r.severity,
        categories: [...r.categories],
        params: r.params,
        is_active: true,
      })),
      ["code"],
    ),
  );

  // Catalog -------------------------------------------------------------------
  const productRows: Row[] = [];
  const variantRows: Row[] = [];
  const offerRows: Row[] = [];
  const historyRows: Row[] = [];

  for (const p of allProducts) {
    const productId = stableUuid(`product:${p.slug}`);
    productRows.push({
      id: productId,
      slug: p.slug,
      category_slug: p.category,
      brand_id: stableUuid(`brand:${p.brand}`),
      name: p.name,
      model: p.model,
      description: p.description,
      specs: p.specs,
      power_draw_w: p.powerDrawW,
      performance_score: p.performanceScore,
      release_date: p.releaseDate,
      status: "published",
    });

    const variants = p.variants ?? [
      { key: "default", label: null as unknown as string, mpn: p.model },
    ];
    const defaultIdx = Math.max(
      0,
      variants.findIndex((x) => ((x as { priceFactor?: number }).priceFactor ?? 1) === 1),
    );
    variants.forEach((v, idx) => {
      const variantId = stableUuid(`variant:${p.slug}:${v.key}`);
      const isDefault = idx === defaultIdx;
      variantRows.push({
        id: variantId,
        product_id: productId,
        sku: `${p.slug}-${v.key}`.toUpperCase(),
        mpn: v.mpn ?? null,
        label: v.label || null,
        specs_override: v.specsOverride ?? {},
        is_default: isDefault,
      });

      for (const region of ref.regions) {
        const pricing = REGION_PRICE_FACTOR[region.code]!;
        const retailersHere = ref.retailers.filter((r) =>
          r.regions.some((rr) => rr.region === region.code),
        );
        // Each retailer stocks ~80 % of products; always keep at least two offers.
        const ranked = retailersHere
          .map((r) => ({ r, h: hash01(`carries:${r.slug}:${p.slug}:${v.key}`) }))
          .sort((a, b) => a.h - b.h);
        const carried = ranked.filter((x, i) => i < 2 || x.h < 0.8).map((x) => x.r);

        for (const r of carried) {
          const key = `${r.slug}:${p.slug}:${v.key}:${region.code}`;
          const jitter = 1 + (hash01(`price:${key}`) - 0.5) * 0.1; // ±5 %
          const base =
            p.referencePriceEur * (v.priceFactor ?? 1) * pricing.factor * r.priceBias * jitter;
          const price = roundRetailPrice(base, pricing.currency);
          const listingType = hash01(`mkt:${key}`) < r.marketplaceShare ? "marketplace" : "retail";
          const offerId = stableUuid(`offer:${key}:${listingType}`);
          const rr = r.regions.find((x) => x.region === region.code)!;
          const stock = stockFor(key);
          const query = encodeURIComponent(p.name);

          offerRows.push({
            id: offerId,
            variant_id: variantId,
            retailer_id: stableUuid(`retailer:${r.slug}`),
            region_code: region.code,
            currency_code: pricing.currency,
            price,
            price_includes_tax: true,
            shipping_cost: null,
            stock_status: stock,
            listing_type: listingType,
            url: r.searchUrlTemplate ? r.searchUrlTemplate.replace("{query}", query) : r.websiteUrl,
            delivery_days_min: listingType === "marketplace" ? rr.days[0] + 2 : rr.days[0],
            delivery_days_max: listingType === "marketplace" ? rr.days[1] + 5 : rr.days[1],
            is_active: true,
            last_checked_at: SEED_AS_OF,
          });

          // History: a gentle downward drift with noise, ending at today's price
          // (the trigger records today's point when the offer is inserted).
          for (let i = HISTORY_POINTS - 1; i >= 1; i--) {
            const daysAgo = Math.round((HISTORY_DAYS / (HISTORY_POINTS - 1)) * i);
            const drift = 1 + 0.06 * (i / (HISTORY_POINTS - 1));
            const noise = 1 + (hash01(`hist:${key}:${i}`) - 0.5) * 0.06;
            historyRows.push({
              offer_id: offerId,
              price: roundRetailPrice(base * drift * noise, pricing.currency),
              currency_code: pricing.currency,
              stock_status: hash01(`hist-stock:${key}:${i}`) < 0.85 ? "in_stock" : "out_of_stock",
              recorded_at: new Date(SEED_AS_OF.getTime() - daysAgo * 86_400_000),
            });
          }
        }
      }
    });
  }

  out.push(upsert("products", productRows, ["id"]));
  out.push(upsert("product_variants", variantRows, ["id"]));
  out.push(upsert("offers", offerRows, ["id"]));
  out.push(
    "-- Replace seeded history so re-running the seed does not duplicate it.",
    `delete from public.price_history where offer_id in (select id from public.offers where last_checked_at = ${sql(SEED_AS_OF)}) and recorded_at < ${sql(SEED_AS_OF)};`,
    upsertHistory(historyRows),
    "commit;",
    "",
  );

  return out.join("\n");
}

function upsertHistory(rows: Row[]): string {
  const cols = ["offer_id", "price", "currency_code", "stock_status", "recorded_at"];
  const chunks: string[] = [];
  for (let i = 0; i < rows.length; i += 1000) {
    const chunk = rows.slice(i, i + 1000);
    chunks.push(
      `insert into public.price_history (${cols.join(", ")}) values\n${chunk
        .map((r) => `  (${cols.map((c) => sql(r[c])).join(", ")})`)
        .join(",\n")};\n`,
    );
  }
  return chunks.join("\n");
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

async function main() {
  const seed = buildSeedSql();
  const target = path.resolve(__dirname, "../supabase/seed.sql");
  writeFileSync(target, seed);
  const counts = {
    products: allProducts.length,
    variants: allProducts.reduce((n, p) => n + (p.variants?.length ?? 1), 0),
  };
  console.log(
    `Wrote ${path.relative(process.cwd(), target)} (${counts.products} products, ${counts.variants} variants)`,
  );

  if (process.argv.includes("--apply")) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set. See .env.example.");
    const { Client } = await import("pg");
    const client = new Client({ connectionString: url });
    await client.connect();
    try {
      await client.query(seed);
      console.log("Seed applied.");
    } finally {
      await client.end();
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
