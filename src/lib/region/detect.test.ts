import { describe, expect, it } from "vitest";

import { countriesFromAcceptLanguage, flagEmoji, resolveRegion, type RegionOption } from "./detect";

const regions: RegionOption[] = [
  {
    code: "RO",
    name: "Romania",
    defaultCurrency: "RON",
    defaultLocale: "ro-RO",
    currencies: ["RON", "EUR"],
  },
  {
    code: "DE",
    name: "Germany",
    defaultCurrency: "EUR",
    defaultLocale: "de-DE",
    currencies: ["EUR"],
  },
];

describe("countriesFromAcceptLanguage", () => {
  it("extracts countries by preference", () => {
    expect(countriesFromAcceptLanguage("en-US;q=0.5,de-DE,ro;q=0.9")).toEqual(["DE", "US"]);
    expect(countriesFromAcceptLanguage(null)).toEqual([]);
    expect(countriesFromAcceptLanguage("*")).toEqual([]);
  });
});

describe("resolveRegion", () => {
  it("prefers an explicit cookie choice, with its currency", () => {
    const r = resolveRegion({
      regions,
      cookieRegion: "RO",
      cookieCurrency: "EUR",
      ipCountry: "DE",
    });
    expect(r).toMatchObject({ source: "cookie", currency: "EUR", locale: "ro-RO" });
    expect(r.region.code).toBe("RO");
  });

  it("ignores a currency the region does not offer", () => {
    expect(resolveRegion({ regions, cookieRegion: "DE", cookieCurrency: "RON" }).currency).toBe(
      "EUR",
    );
  });

  it("falls through profile, IP, language and default", () => {
    expect(resolveRegion({ regions, profileRegion: "DE" }).source).toBe("profile");
    expect(resolveRegion({ regions, ipCountry: "de" }).region.code).toBe("DE");
    expect(
      resolveRegion({ regions, ipCountry: "FR", acceptLanguage: "fr-FR,de-DE;q=0.8" }),
    ).toMatchObject({
      source: "language",
      region: { code: "DE" },
    });
    expect(resolveRegion({ regions, ipCountry: "US", defaultRegion: "DE" })).toMatchObject({
      source: "default",
      region: { code: "DE" },
    });
    expect(resolveRegion({ regions }).region.code).toBe("RO");
  });

  it("skips unknown or inactive cookie regions", () => {
    expect(resolveRegion({ regions, cookieRegion: "FR", ipCountry: "DE" }).source).toBe("ip");
  });

  it("requires at least one region", () => {
    expect(() => resolveRegion({ regions: [] })).toThrow();
  });
});

describe("flagEmoji", () => {
  it("builds regional indicator flags", () => {
    expect(flagEmoji("ro")).toBe("🇷🇴");
  });
});
