import { describe, expect, it } from "vitest";

import {
  add,
  CurrencyMismatchError,
  formatMoney,
  minorUnitsFor,
  money,
  multiply,
  sum,
  toDecimal,
  toDecimalString,
  toMinor,
} from "./money";
import { convert, ExchangeRateNotFoundError, findRate, type ExchangeRate } from "./exchange";
import { addTax, findTaxRule, splitGross, TaxRuleNotFoundError, type TaxRule } from "./tax";

describe("money", () => {
  it("parses decimals exactly", () => {
    expect(toMinor("1234.99", "RON")).toBe(123499);
    expect(toMinor("0.1", "EUR")).toBe(10);
    expect(toMinor("19.995", "EUR")).toBe(2000);
    expect(toMinor("19.9949", "EUR")).toBe(1999);
    expect(toMinor("-5.5", "EUR")).toBe(-550);
    expect(toMinor(0.1 + 0.2, "EUR")).toBe(30);
    expect(toMinor("1500", "JPY")).toBe(1500);
  });

  it("rejects malformed amounts", () => {
    expect(() => toMinor("12,50", "EUR")).toThrow(RangeError);
    expect(() => toMinor(Number.NaN, "EUR")).toThrow(RangeError);
  });

  it("knows minor units per currency", () => {
    expect(minorUnitsFor("EUR")).toBe(2);
    expect(minorUnitsFor("RON")).toBe(2);
    expect(minorUnitsFor("JPY")).toBe(0);
  });

  it("adds, multiplies and sums without float drift", () => {
    const tenths = Array.from({ length: 10 }, () => money("0.10", "EUR"));
    expect(sum(tenths, "EUR")).toEqual({ amount: 100, currency: "EUR" });
    expect(multiply(money("33.33", "EUR"), 3).amount).toBe(9999);
    expect(add(money(1, "EUR"), money("2.50", "EUR")).amount).toBe(350);
  });

  it("refuses to mix currencies", () => {
    expect(() => add(money(1, "EUR"), money(1, "RON"))).toThrow(CurrencyMismatchError);
  });

  it("converts back to decimals and strings", () => {
    expect(toDecimal(money("1234.99", "RON"))).toBe(1234.99);
    expect(toDecimalString(money("1234.9", "RON"))).toBe("1234.90");
    expect(toDecimalString(money("0.05", "EUR"))).toBe("0.05");
    expect(toDecimalString(money("-3", "EUR"))).toBe("-3.00");
  });

  it("formats per locale", () => {
    expect(formatMoney(money("1234.99", "EUR"), "de-DE")).toMatch(/^1\.234,99\s€$/);
    expect(formatMoney(money("1234.99", "RON"), "ro-RO")).toMatch(/^1\.234,99\sRON$/);
  });
});

describe("exchange", () => {
  const rates: ExchangeRate[] = [
    { base: "EUR", quote: "RON", rate: 4.9, validAt: "2026-01-01T00:00:00Z" },
    { base: "EUR", quote: "RON", rate: 5.09, validAt: "2026-11-20T00:00:00Z" },
    { base: "EUR", quote: "USD", rate: 1.16, validAt: "2026-11-20T00:00:00Z" },
    { base: "EUR", quote: "GBP", rate: 0.86, validAt: "2030-01-01T00:00:00Z" },
  ];
  const at = new Date("2026-11-23T00:00:00Z");

  it("uses the latest rate valid at the given time", () => {
    expect(findRate("EUR", "RON", rates, at)).toBe(5.09);
    expect(findRate("EUR", "RON", rates, new Date("2026-06-01"))).toBe(4.9);
  });

  it("inverts and crosses rates", () => {
    expect(findRate("RON", "EUR", rates, at)).toBeCloseTo(1 / 5.09, 10);
    expect(findRate("RON", "USD", rates, at)).toBeCloseTo(1.16 / 5.09, 10);
  });

  it("ignores rates from the future and fails clearly", () => {
    expect(() => findRate("EUR", "GBP", rates, at)).toThrow(ExchangeRateNotFoundError);
  });

  it("converts and rounds to the target currency", () => {
    expect(convert(money("100", "EUR"), "RON", rates, at)).toEqual({
      amount: 50900,
      currency: "RON",
    });
    expect(convert(money("509", "RON"), "EUR", rates, at)).toEqual({
      amount: 10000,
      currency: "EUR",
    });
    const same = money("1", "EUR");
    expect(convert(same, "EUR", rates, at)).toBe(same);
  });
});

describe("tax", () => {
  const rules: TaxRule[] = [
    {
      regionCode: "RO",
      categorySlug: null,
      rate: 0.19,
      validFrom: "2017-01-01",
      validTo: "2025-08-01",
    },
    { regionCode: "RO", categorySlug: null, rate: 0.21, validFrom: "2025-08-01", validTo: null },
    {
      regionCode: "RO",
      categorySlug: "monitor",
      rate: 0.11,
      validFrom: "2025-08-01",
      validTo: null,
    },
    { regionCode: "DE", categorySlug: null, rate: 0.19, validFrom: "2021-01-01", validTo: null },
  ];

  it("picks the rule valid on the date", () => {
    expect(findTaxRule(rules, "RO", "cpu", new Date("2025-07-31T12:00:00Z")).rate).toBe(0.19);
    expect(findTaxRule(rules, "RO", "cpu", new Date("2025-08-01T00:00:00Z")).rate).toBe(0.21);
  });

  it("prefers a category-specific rule", () => {
    expect(findTaxRule(rules, "RO", "monitor", new Date("2026-01-01")).rate).toBe(0.11);
    expect(findTaxRule(rules, "DE", "monitor", new Date("2026-01-01")).rate).toBe(0.19);
  });

  it("fails when a region has no rule", () => {
    expect(() => findTaxRule(rules, "FR", null)).toThrow(TaxRuleNotFoundError);
  });

  it("splits gross into net + tax that add back up", () => {
    const { net, tax } = splitGross(money("121", "RON"), 0.21);
    expect(net.amount).toBe(10000);
    expect(tax.amount).toBe(2100);
    const odd = splitGross(money("99.99", "EUR"), 0.19);
    expect(odd.net.amount + odd.tax.amount).toBe(9999);
  });

  it("adds tax to net prices", () => {
    expect(addTax(money("100", "EUR"), 0.19).gross.amount).toBe(11900);
  });
});
