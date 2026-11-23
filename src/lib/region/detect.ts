/**
 * Pure region detection (no I/O), so it can be unit-tested. The server
 * wrapper in server.ts supplies cookies, headers and the active regions.
 */

export type RegionOption = {
  code: string;
  name: string;
  defaultCurrency: string;
  defaultLocale: string;
  currencies: string[];
};

export type RegionSource = "cookie" | "profile" | "ip" | "language" | "default";

export type ResolvedRegion = {
  region: RegionOption;
  currency: string;
  locale: string;
  source: RegionSource;
};

export type DetectionInput = {
  regions: RegionOption[];
  cookieRegion?: string | null;
  cookieCurrency?: string | null;
  profileRegion?: string | null;
  profileCurrency?: string | null;
  /** Country from the hosting edge, e.g. x-vercel-ip-country / cf-ipcountry. */
  ipCountry?: string | null;
  acceptLanguage?: string | null;
  defaultRegion?: string | null;
};

/** Country codes from an Accept-Language header, in preference order ("ro-RO,en;q=0.8" → ["RO"]). */
export function countriesFromAcceptLanguage(header: string | null | undefined): string[] {
  if (!header) return [];
  return header
    .split(",")
    .map((part) => {
      const [tag = "", ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      return { tag, q: q ? Number(q.trim().slice(2)) || 0 : 1 };
    })
    .sort((a, b) => b.q - a.q)
    .map(({ tag }) => tag.split("-")[1]?.toUpperCase())
    .filter((c): c is string => Boolean(c && /^[A-Z]{2}$/.test(c)));
}

/**
 * Pick the market to show: an explicit choice (cookie) wins, then the
 * signed-in user's saved preference, then IP country, then browser
 * language, then the configured default.
 */
export function resolveRegion(input: DetectionInput): ResolvedRegion {
  const { regions } = input;
  if (regions.length === 0) throw new Error("No active regions configured");
  const find = (code: string | null | undefined) =>
    code ? regions.find((r) => r.code === code.toUpperCase()) : undefined;

  const candidates: Array<[RegionSource, RegionOption | undefined, string | null | undefined]> = [
    ["cookie", find(input.cookieRegion), input.cookieCurrency],
    ["profile", find(input.profileRegion), input.profileCurrency],
    ["ip", find(input.ipCountry), null],
    ...countriesFromAcceptLanguage(input.acceptLanguage).map(
      (c) => ["language", find(c), null] as [RegionSource, RegionOption | undefined, null],
    ),
    ["default", find(input.defaultRegion) ?? regions[0], null],
  ];

  const [source, region, preferredCurrency] = candidates.find(([, r]) => r !== undefined)! as [
    RegionSource,
    RegionOption,
    string | null | undefined,
  ];
  const currency =
    preferredCurrency && region.currencies.includes(preferredCurrency.toUpperCase())
      ? preferredCurrency.toUpperCase()
      : region.defaultCurrency;

  return { region, currency, locale: region.defaultLocale, source };
}

/** Regional-indicator emoji flag for an ISO country code. */
export function flagEmoji(code: string): string {
  return code
    .toUpperCase()
    .replace(/./g, (ch) => String.fromCodePoint(0x1f1e6 - 65 + ch.charCodeAt(0)));
}
