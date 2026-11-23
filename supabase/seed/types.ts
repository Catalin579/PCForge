import type { CategorySlug, SpecsFor } from "../../src/lib/catalog/specs";
import type { BrandSlug } from "./data/reference";

export type SeedVariant = {
  /** Appended to the product slug to form the SKU. */
  key: string;
  label: string;
  mpn?: string;
  specsOverride?: Record<string, unknown>;
  /** Price multiplier relative to the product's reference price. */
  priceFactor?: number;
};

export type SeedProduct<C extends CategorySlug = CategorySlug> = {
  slug: string;
  category: C;
  brand: BrandSlug;
  name: string;
  model: string;
  description: string;
  specs: SpecsFor<C>;
  /** Typical load power draw in watts. */
  powerDrawW: number;
  /** 0-100 within the category. */
  performanceScore: number;
  releaseDate: string;
  /** Reference street price in EUR incl. VAT; regional offers derive from it. */
  referencePriceEur: number;
  mpn?: string;
  variants?: SeedVariant[];
};

/** Helper that keeps `specs` typed to the category. */
export function product<C extends CategorySlug>(p: SeedProduct<C>): SeedProduct<C> {
  return p;
}
