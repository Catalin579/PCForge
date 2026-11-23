import { roundHalfAwayFromZero, type Money } from "./money";

/** A `tax_rules` row. `rate` is a fraction: 0.21 = 21 %. */
export type TaxRule = {
  regionCode: string;
  categorySlug: string | null;
  rate: number;
  validFrom: string | Date;
  validTo: string | Date | null;
  name?: string;
};

export class TaxRuleNotFoundError extends Error {
  constructor(region: string) {
    super(`No tax rule for region ${region}`);
    this.name = "TaxRuleNotFoundError";
  }
}

const day = (d: string | Date) => (d instanceof Date ? d.toISOString() : d).slice(0, 10);

function isValidOn(rule: TaxRule, date: string): boolean {
  return day(rule.validFrom) <= date && (rule.validTo === null || date < day(rule.validTo));
}

/**
 * The VAT rule for a product category in a region on a date. A
 * category-specific rule beats the region's standard (category = null) rule.
 */
export function findTaxRule(
  rules: TaxRule[],
  regionCode: string,
  categorySlug: string | null,
  at: Date = new Date(),
): TaxRule {
  const date = day(at);
  const valid = rules.filter((r) => r.regionCode === regionCode && isValidOn(r, date));
  const specific = categorySlug ? valid.find((r) => r.categorySlug === categorySlug) : undefined;
  const standard = valid.find((r) => r.categorySlug === null);
  const rule = specific ?? standard;
  if (!rule) throw new TaxRuleNotFoundError(regionCode);
  return rule;
}

/** Split a tax-inclusive amount into net and tax. net + tax === gross. */
export function splitGross(gross: Money, rate: number): { net: Money; tax: Money } {
  const net = roundHalfAwayFromZero(gross.amount / (1 + rate));
  return {
    net: { amount: net, currency: gross.currency },
    tax: { amount: gross.amount - net, currency: gross.currency },
  };
}

/** Add tax to a net amount. */
export function addTax(net: Money, rate: number): { gross: Money; tax: Money } {
  const tax = roundHalfAwayFromZero(net.amount * rate);
  return {
    gross: { amount: net.amount + tax, currency: net.currency },
    tax: { amount: tax, currency: net.currency },
  };
}
