import { describe, expect, it } from "vitest";

import { categories, compatibilityRules } from "../supabase/seed/data/reference";
import {
  allProducts,
  buildSeedSql,
  hash01,
  roundRetailPrice,
  stableUuid,
  validateProducts,
} from "./generate-seed";

describe("seed generator", () => {
  it("has valid specs for every product and variant", () => {
    expect(() => validateProducts(allProducts)).not.toThrow();
  });

  it("covers every core category with several products", () => {
    for (const c of categories.filter((c) => c.isCore)) {
      const count = allProducts.filter((p) => p.category === c.slug).length;
      expect(count, c.slug).toBeGreaterThanOrEqual(8);
    }
  });

  it("is deterministic", () => {
    expect(stableUuid("x")).toBe(stableUuid("x"));
    expect(stableUuid("x")).not.toBe(stableUuid("y"));
    expect(stableUuid("x")).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(hash01("a")).toBeGreaterThanOrEqual(0);
    expect(hash01("a")).toBeLessThan(1);
    expect(buildSeedSql()).toBe(buildSeedSql());
  });

  it("rounds prices to retail endings", () => {
    expect(roundRetailPrice(1234.4, "RON")).toBe(1233.99);
    expect(roundRetailPrice(123.6, "EUR")).toBe(123.9);
  });

  it("seeds a row for every compatibility rule", () => {
    const seed = buildSeedSql();
    for (const rule of compatibilityRules) expect(seed).toContain(`'${rule.code}'`);
  });
});
