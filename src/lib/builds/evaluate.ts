import "server-only";

import { type SupabaseClient } from "@supabase/supabase-js";

import {
  evaluateBuild,
  toBuildComponent,
  type CompatibilityReport,
  type RuleConfig,
} from "@/lib/compatibility";
import { priceBuild, type BuildPrice, type OfferRow, type PricingContext } from "@/lib/pricing";
import { type Database } from "@/lib/supabase/database.types";

import { evaluateBuildInputSchema, type EvaluateBuildInput } from "./schema";

type Client = SupabaseClient<Database>;

export class BuildEvaluationError extends Error {
  constructor(
    message: string,
    readonly code:
      "invalid_input" | "unknown_region" | "unsupported_currency" | "unknown_variant" | "database",
  ) {
    super(message);
    this.name = "BuildEvaluationError";
  }
}

export type BuildEvaluation = {
  regionCode: string;
  currency: string;
  compatibility: CompatibilityReport;
  price: BuildPrice;
};

/**
 * Server-side evaluation of a build: loads parts, offers, rules, taxes and
 * rates for the region, then runs the compatibility engine and the pricing
 * service. Input from clients is validated here; nothing the client sends
 * about prices or compatibility is trusted.
 */
export async function evaluateBuildForRegion(
  supabase: Client,
  rawInput: EvaluateBuildInput,
  at: Date = new Date(),
): Promise<BuildEvaluation> {
  const parsed = evaluateBuildInputSchema.safeParse(rawInput);
  if (!parsed.success) throw new BuildEvaluationError(parsed.error.message, "invalid_input");
  const input = parsed.data;

  const { data: region, error: regionError } = await supabase
    .from("regions")
    .select("code, default_currency")
    .eq("code", input.regionCode)
    .maybeSingle();
  if (regionError) throw new BuildEvaluationError(regionError.message, "database");
  if (!region)
    throw new BuildEvaluationError(`Unknown region ${input.regionCode}`, "unknown_region");

  const currency = input.currencyCode ?? region.default_currency;
  if (currency !== region.default_currency) {
    const allowed = await many(
      supabase.from("region_currencies").select("currency_code").eq("region_code", region.code),
    );
    if (!allowed.some((r) => r.currency_code === currency)) {
      throw new BuildEvaluationError(
        `${currency} is not offered in ${region.code}`,
        "unsupported_currency",
      );
    }
  }

  const variantIds = [...new Set(input.items.map((i) => i.variantId))];

  const [variants, offers, rules, taxRules, rates, retailerRegions] = await Promise.all([
    variantIds.length
      ? many(
          supabase
            .from("product_variants")
            .select(
              "id, specs_override, products!inner(id, name, category_slug, specs, power_draw_w, performance_score)",
            )
            .in("id", variantIds),
        )
      : Promise.resolve([]),
    variantIds.length
      ? many(
          supabase
            .from("offers")
            .select("*")
            .in("variant_id", variantIds)
            .eq("region_code", region.code)
            .eq("is_active", true),
        )
      : Promise.resolve([]),
    many(supabase.from("compatibility_rules").select("code, severity, is_active, params")),
    many(
      supabase
        .from("tax_rules")
        .select("region_code, category_slug, rate, valid_from, valid_to")
        .eq("region_code", region.code),
    ),
    many(supabase.from("exchange_rates").select("base_currency, quote_currency, rate, valid_at")),
    many(supabase.from("retailer_regions").select("*").eq("region_code", region.code)),
  ]);

  const variantById = new Map(variants.map((v) => [v.id, v]));
  const missing = variantIds.filter((id) => !variantById.has(id));
  if (missing.length)
    throw new BuildEvaluationError(`Unknown products: ${missing.join(", ")}`, "unknown_variant");

  const components = input.items.map((item) => {
    const v = variantById.get(item.variantId)!;
    const p = v.products;
    return toBuildComponent({
      variantId: v.id,
      productId: p.id,
      name: p.name,
      categorySlug: p.category_slug,
      specs: p.specs,
      specsOverride: v.specs_override,
      quantity: item.quantity,
      powerDrawW: p.power_draw_w,
      performanceScore: p.performance_score,
    });
  });

  const ruleConfigs: RuleConfig[] = rules.map((r) => ({
    code: r.code,
    severity: r.severity,
    isActive: r.is_active,
    params: isRecord(r.params) ? r.params : {},
  }));

  const ctx: PricingContext = {
    regionCode: region.code,
    displayCurrency: currency,
    at,
    rates: rates.map((r) => ({
      base: r.base_currency,
      quote: r.quote_currency,
      rate: Number(r.rate),
      validAt: r.valid_at,
    })),
    taxRules: taxRules.map((t) => ({
      regionCode: t.region_code,
      categorySlug: t.category_slug,
      rate: Number(t.rate),
      validFrom: t.valid_from,
      validTo: t.valid_to,
    })),
    retailerRegions: retailerRegions.map((r) => ({
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

  const offerRows: OfferRow[] = offers.map((o) => ({
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
  }));

  return {
    regionCode: region.code,
    currency,
    compatibility: evaluateBuild(components, { rules: ruleConfigs, useCase: input.useCase }),
    price: priceBuild(
      input.items.map((item) => ({
        variantId: item.variantId,
        categorySlug: variantById.get(item.variantId)!.products.category_slug,
        quantity: item.quantity,
        selectedOfferId: item.selectedOfferId ?? null,
      })),
      offerRows,
      ctx,
      { includeMarketplace: input.includeMarketplace ?? true },
    ),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function many<T>(
  query: PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const { data, error } = await query;
  if (error) throw new BuildEvaluationError(error.message, "database");
  return data ?? [];
}
