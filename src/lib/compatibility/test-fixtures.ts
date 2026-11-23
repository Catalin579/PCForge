/**
 * Test helpers: build components from the real seed catalog, with optional
 * spec tweaks for edge cases. Not imported by application code.
 */
import { type CategorySlug } from "@/lib/catalog/specs";

import { cases, caseFans, coolers } from "../../../supabase/seed/data/products-chassis";
import { cpus, memory, motherboards } from "../../../supabase/seed/data/products-platform";
import { gpus, psus, storage } from "../../../supabase/seed/data/products-power";
import { type SeedProduct } from "../../../supabase/seed/types";

import { toBuildComponent } from "./from-row";
import { type AnyBuildComponent } from "./types";

const catalog = [
  ...cpus,
  ...motherboards,
  ...memory,
  ...gpus,
  ...storage,
  ...psus,
  ...cases,
  ...coolers,
  ...caseFans,
] as SeedProduct[];

export function part(
  slug: string,
  opts: { quantity?: number; specs?: Record<string, unknown>; id?: string } = {},
): AnyBuildComponent {
  const p = catalog.find((x) => x.slug === slug);
  if (!p) throw new Error(`No seed product ${slug}`);
  return toBuildComponent({
    variantId: opts.id ?? `v-${slug}`,
    productId: `p-${slug}`,
    name: p.name,
    categorySlug: p.category,
    specs: p.specs,
    specsOverride: opts.specs,
    quantity: opts.quantity,
    powerDrawW: p.powerDrawW,
    performanceScore: p.performanceScore,
  });
}

/** A complete, fully compatible mid-range AM5 gaming build. */
export function goodAm5Build(): AnyBuildComponent[] {
  return [
    part("amd-ryzen-7-7800x3d"),
    part("msi-b650-gaming-plus-wifi"),
    part("kingston-fury-beast-ddr5-6000-cl30-32gb"),
    part("sapphire-pulse-radeon-rx-9070-xt"),
    part("samsung-990-pro-2tb"),
    part("corsair-rm850x-2024"),
    part("lian-li-lancool-216"),
    part("thermalright-peerless-assassin-120-se"),
  ] as AnyBuildComponent[];
}

/** Replace the part of the same category in a build. */
export function swap(
  build: AnyBuildComponent[],
  replacement: AnyBuildComponent,
): AnyBuildComponent[] {
  return [...build.filter((c) => c.category !== replacement.category), replacement];
}

export function without(build: AnyBuildComponent[], category: CategorySlug): AnyBuildComponent[] {
  return build.filter((c) => c.category !== category);
}
