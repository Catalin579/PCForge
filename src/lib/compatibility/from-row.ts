import { isCategorySlug, safeParseSpecs } from "@/lib/catalog/specs";

import { type AnyBuildComponent } from "./types";

/** The shape callers load from products + product_variants (+ build_items). */
export type ComponentRow = {
  variantId: string;
  productId: string;
  name: string;
  categorySlug: string;
  specs: unknown;
  specsOverride?: unknown;
  quantity?: number;
  powerDrawW?: number | null;
  performanceScore?: number | null;
};

export class InvalidComponentError extends Error {
  constructor(
    readonly variantId: string,
    message: string,
  ) {
    super(message);
    this.name = "InvalidComponentError";
  }
}

/**
 * Turn a database row into a typed build component: merges the variant's
 * spec overrides and validates the result against the category schema, so
 * the engine never runs on malformed specs.
 */
export function toBuildComponent(row: ComponentRow): AnyBuildComponent {
  if (!isCategorySlug(row.categorySlug)) {
    throw new InvalidComponentError(row.variantId, `Unknown category "${row.categorySlug}"`);
  }
  const base = isPlainObject(row.specs) ? row.specs : {};
  const override = isPlainObject(row.specsOverride) ? row.specsOverride : {};
  const parsed = safeParseSpecs(row.categorySlug, { ...base, ...override });
  if (!parsed.success) {
    throw new InvalidComponentError(
      row.variantId,
      `Invalid ${row.categorySlug} specs for "${row.name}": ${parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ")}`,
    );
  }
  return {
    id: row.variantId,
    productId: row.productId,
    name: row.name,
    category: row.categorySlug,
    specs: parsed.data,
    quantity: row.quantity ?? 1,
    powerDrawW: row.powerDrawW ?? null,
    performanceScore: row.performanceScore ?? null,
  } as AnyBuildComponent;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
