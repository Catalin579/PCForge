import "server-only";

import { type SupabaseClient } from "@supabase/supabase-js";

import { safeExternalUrl } from "@/lib/catalog/queries";
import { type Database } from "@/lib/supabase/database.types";

import { evaluateBuildForRegion, type BuildEvaluation } from "./evaluate";
import { type EvaluateBuildInput } from "./schema";

export type BuildView = BuildEvaluation & {
  products: Record<
    string,
    { name: string; slug: string; category: string; brandName: string; imageUrl: string | null }
  >;
  retailers: Record<string, { name: string; slug: string }>;
  /** Safe outbound link per offer id. */
  offerLinks: Record<string, string | null>;
};

/** Evaluate a build and attach the names and links the UI needs to show it. */
export async function buildView(
  supabase: SupabaseClient<Database>,
  input: EvaluateBuildInput,
): Promise<BuildView> {
  const evaluation = await evaluateBuildForRegion(supabase, input);
  const variantIds = [...new Set(input.items.map((i) => i.variantId))];
  const retailerIds = [
    ...new Set(evaluation.price.lines.flatMap((l) => (l.quote ? [l.quote.offer.retailerId] : []))),
  ];

  const [variants, retailers] = await Promise.all([
    variantIds.length
      ? supabase
          .from("product_variants")
          .select("id, label, products!inner(name, slug, category_slug, image_urls, brands(name))")
          .in("id", variantIds)
      : Promise.resolve({ data: [], error: null }),
    retailerIds.length
      ? supabase.from("retailers").select("id, name, slug").in("id", retailerIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const products: BuildView["products"] = {};
  for (const v of variants.data ?? []) {
    products[v.id] = {
      name: v.label ? `${v.products.name} (${v.label})` : v.products.name,
      slug: v.products.slug,
      category: v.products.category_slug,
      brandName: v.products.brands.name,
      imageUrl: v.products.image_urls?.[0] ?? null,
    };
  }
  const retailerMap: BuildView["retailers"] = {};
  for (const r of retailers.data ?? []) retailerMap[r.id] = { name: r.name, slug: r.slug };

  const offerLinks: BuildView["offerLinks"] = {};
  for (const line of evaluation.price.lines) {
    for (const q of [line.quote, line.cheaperAlternative]) {
      if (q) offerLinks[q.offer.id] = safeExternalUrl(q.offer.url);
    }
  }

  return { ...evaluation, products, retailers: retailerMap, offerLinks };
}
