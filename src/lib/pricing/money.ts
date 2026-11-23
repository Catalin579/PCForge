/**
 * Money as integer minor units (cents, bani) plus an ISO 4217 code.
 * All arithmetic happens on integers; convert to decimals only for display
 * or for writing `numeric` columns.
 */

export type Money = {
  /** Integer amount in minor units, e.g. 123499 = 1 234,99 lei. */
  amount: number;
  currency: string;
};

export class CurrencyMismatchError extends Error {
  constructor(a: string, b: string) {
    super(`Cannot combine ${a} and ${b} amounts without converting first`);
    this.name = "CurrencyMismatchError";
  }
}

const minorUnitCache = new Map<string, number>();

/** Number of minor units for a currency (2 for EUR/RON, 0 for JPY). */
export function minorUnitsFor(currency: string): number {
  const code = currency.toUpperCase();
  const cached = minorUnitCache.get(code);
  if (cached !== undefined) return cached;
  let digits = 2;
  try {
    digits =
      new Intl.NumberFormat("en", { style: "currency", currency: code }).resolvedOptions()
        .maximumFractionDigits ?? 2;
  } catch {
    // Unknown to Intl: keep the common default.
  }
  minorUnitCache.set(code, digits);
  return digits;
}

/** Round half away from zero, so 0.5 → 1 and -0.5 → -1 (commercial rounding). */
export function roundHalfAwayFromZero(value: number): number {
  const rounded = Math.round(Math.abs(value) + Number.EPSILON * Math.abs(value));
  return value < 0 ? -rounded : rounded;
}

/**
 * Parse a decimal (a Postgres `numeric` arrives as a string through
 * PostgREST, or as a number) into minor units without float drift.
 */
export function toMinor(value: string | number, currency: string): number {
  const units = minorUnitsFor(currency);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new RangeError(`Invalid amount: ${value}`);
    return roundHalfAwayFromZero(value * 10 ** units);
  }
  const trimmed = value.trim();
  const match = /^(-)?(\d+)(?:\.(\d+))?$/.exec(trimmed);
  if (!match) throw new RangeError(`Invalid decimal amount: "${value}"`);
  const [, sign, whole, frac = ""] = match;
  const padded = (frac + "0".repeat(units + 1)).slice(0, units + 1);
  // Use the digit after the last kept one to round half away from zero.
  let minor = Number(whole) * 10 ** units + Number(padded.slice(0, units) || "0");
  if (Number(padded[units]) >= 5) minor += 1;
  return sign ? -minor : minor;
}

export function money(value: string | number, currency: string): Money {
  return { amount: toMinor(value, currency), currency: currency.toUpperCase() };
}

export function zero(currency: string): Money {
  return { amount: 0, currency: currency.toUpperCase() };
}

/** Decimal number for storage or charts (not for further arithmetic). */
export function toDecimal(m: Money): number {
  return m.amount / 10 ** minorUnitsFor(m.currency);
}

/** Decimal string with exactly the currency's minor units, e.g. "1234.99". */
export function toDecimalString(m: Money): string {
  const units = minorUnitsFor(m.currency);
  const abs = Math.abs(m.amount)
    .toString()
    .padStart(units + 1, "0");
  const whole = units ? abs.slice(0, -units) : abs;
  const frac = units ? `.${abs.slice(-units)}` : "";
  return `${m.amount < 0 ? "-" : ""}${whole}${frac}`;
}

export function add(a: Money, b: Money): Money {
  if (a.currency !== b.currency) throw new CurrencyMismatchError(a.currency, b.currency);
  return { amount: a.amount + b.amount, currency: a.currency };
}

export function subtract(a: Money, b: Money): Money {
  if (a.currency !== b.currency) throw new CurrencyMismatchError(a.currency, b.currency);
  return { amount: a.amount - b.amount, currency: a.currency };
}

export function multiply(a: Money, factor: number): Money {
  return { amount: roundHalfAwayFromZero(a.amount * factor), currency: a.currency };
}

export function sum(items: Money[], currency: string): Money {
  return items.reduce((acc, m) => add(acc, m), zero(currency));
}

export function compare(a: Money, b: Money): number {
  if (a.currency !== b.currency) throw new CurrencyMismatchError(a.currency, b.currency);
  return a.amount - b.amount;
}

/** Locale-aware display, e.g. formatMoney(m, "ro-RO") → "1.234,99 RON". */
export function formatMoney(
  m: Money,
  locale: string,
  options: Intl.NumberFormatOptions = {},
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: m.currency,
    ...options,
  }).format(toDecimal(m));
}
