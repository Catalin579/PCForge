import { describe, expect, it } from "vitest";

import { CATEGORY_SLUGS, isCategorySlug, parseSpecs, safeParseSpecs } from "./specs";

describe("component spec schemas", () => {
  it("accepts a valid CPU", () => {
    const cpu = parseSpecs("cpu", {
      socket: "AM5",
      architecture: "Zen 4",
      cores: 8,
      threads: 16,
      baseClockGhz: 4.2,
      boostClockGhz: 5,
      l3CacheMb: 96,
      tdpW: 120,
      maxPowerW: 162,
      memoryTypes: ["DDR5"],
      maxMemorySpeedMts: 5200,
      integratedGraphics: true,
      coolerIncluded: false,
      pcieVersion: "5.0",
    });
    expect(cpu.socket).toBe("AM5");
  });

  it("rejects an unknown socket", () => {
    const result = safeParseSpecs("motherboard", { socket: "LGA9999" });
    expect(result.success).toBe(false);
  });

  it("discriminates air and liquid coolers", () => {
    expect(
      safeParseSpecs("cpu-cooler", {
        type: "air",
        sockets: ["AM5"],
        heightMm: 155,
        tdpRatingW: 200,
        fans: 1,
      }).success,
    ).toBe(true);
    // A liquid cooler needs a radiator size, not a height.
    expect(
      safeParseSpecs("cpu-cooler", {
        type: "aio",
        sockets: ["AM5"],
        heightMm: 155,
        tdpRatingW: 200,
        fans: 2,
      }).success,
    ).toBe(false);
  });

  it("knows every category slug", () => {
    expect(CATEGORY_SLUGS).toContain("gpu");
    expect(isCategorySlug("psu")).toBe(true);
    expect(isCategorySlug("toaster")).toBe(false);
  });
});
