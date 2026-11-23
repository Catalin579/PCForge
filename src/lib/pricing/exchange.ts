import { minorUnitsFor, roundHalfAwayFromZero, type Money } from "./money";

/** An `exchange_rates` row: 1 base = rate quote. */
export type ExchangeRate = {
  base: string;
  quote: string;
  rate: number;
  validAt: string | Date;
};

export class ExchangeRateNotFoundError extends Error {
  constructor(
    readonly from: string,
    readonly to: string,
  ) {
    super(`No exchange rate available from ${from} to ${to}`);
    this.name = "ExchangeRateNotFoundError";
  }
}

const time = (d: string | Date) => (d instanceof Date ? d.getTime() : Date.parse(d));

/** Latest rate per (base, quote) pair valid at `at`. */
function latestRates(rates: ExchangeRate[], at: Date): Map<string, number> {
  const best = new Map<string, { rate: number; t: number }>();
  const limit = at.getTime();
  for (const r of rates) {
    const t = time(r.validAt);
    if (Number.isNaN(t) || t > limit || !(r.rate > 0)) continue;
    const key = `${r.base.toUpperCase()}>${r.quote.toUpperCase()}`;
    const current = best.get(key);
    if (!current || t > current.t) best.set(key, { rate: r.rate, t });
  }
  return new Map([...best].map(([k, v]) => [k, v.rate]));
}

/**
 * The rate to multiply `from` amounts by to get `to` amounts. Tries a direct
 * rate, the inverse of the reverse rate, then a cross rate through any
 * shared currency (e.g. RON → USD via EUR).
 */
export function findRate(
  from: string,
  to: string,
  rates: ExchangeRate[],
  at: Date = new Date(),
): number {
  const f = from.toUpperCase();
  const t = to.toUpperCase();
  if (f === t) return 1;
  const table = latestRates(rates, at);

  const direct = (a: string, b: string): number | undefined => {
    if (a === b) return 1;
    const d = table.get(`${a}>${b}`);
    if (d !== undefined) return d;
    const inv = table.get(`${b}>${a}`);
    return inv !== undefined ? 1 / inv : undefined;
  };

  const d = direct(f, t);
  if (d !== undefined) return d;

  const currencies = new Set([...table.keys()].flatMap((k) => k.split(">")));
  for (const via of currencies) {
    const a = direct(f, via);
    const b = direct(via, t);
    if (a !== undefined && b !== undefined) return a * b;
  }
  throw new ExchangeRateNotFoundError(f, t);
}

/** Convert money into another currency, rounding to the target's minor units. */
export function convert(m: Money, to: string, rates: ExchangeRate[], at: Date = new Date()): Money {
  const target = to.toUpperCase();
  if (m.currency === target) return m;
  const rate = findRate(m.currency, target, rates, at);
  const scale = 10 ** (minorUnitsFor(target) - minorUnitsFor(m.currency));
  return { amount: roundHalfAwayFromZero(m.amount * rate * scale), currency: target };
}
