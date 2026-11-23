import { describe, expect, it } from "vitest";

import { BuildContext } from "./build-context";
import { evaluateBuild } from "./engine";
import { InvalidComponentError, toBuildComponent } from "./from-row";
import { estimateBottleneck, estimatePerformance, tierForScore } from "./performance";
import { estimatePower, MISC_LOAD_W, roundUpToPsuSize } from "./power";
import { goodAm5Build, part, swap, without } from "./test-fixtures";
import { type AnyBuildComponent } from "./types";

describe("estimatePower", () => {
  it("sums peak draw of internal parts plus a misc allowance", () => {
    const power = estimatePower(new BuildContext(goodAm5Build()));
    // 7800X3D 162 + RX 9070 XT 304 + board 35 + RAM 8 + SSD 6 + cooler 4 + misc
    expect(power.peakW).toBe(162 + 304 + 35 + 8 + 6 + 4 + MISC_LOAD_W);
    expect(power.typicalLoadW).toBeLessThan(power.peakW);
    expect(power.psuW).toBe(850);
    expect(power.loadRatio).toBeCloseTo(power.peakW / 850, 2);
  });

  it("recommends at least the GPU maker's PSU size", () => {
    const power = estimatePower(new BuildContext(goodAm5Build()));
    expect(power.recommendedPsuW).toBe(750);
  });

  it("scales with quantity", () => {
    const one = estimatePower(
      new BuildContext([part("seagate-barracuda-2tb")] as AnyBuildComponent[]),
    );
    const four = estimatePower(
      new BuildContext([part("seagate-barracuda-2tb", { quantity: 4 })] as AnyBuildComponent[]),
    );
    expect(four.peakW - MISC_LOAD_W).toBe((one.peakW - MISC_LOAD_W) * 4);
  });

  it("ignores the PSU, case and parts with no draw", () => {
    const power = estimatePower(
      new BuildContext([
        part("corsair-rm850x-2024"),
        part("lian-li-lancool-216"),
      ] as AnyBuildComponent[]),
    );
    expect(power.peakW).toBe(0);
    expect(power.recommendedPsuW).toBe(0);
    expect(power.psuW).toBe(850);
  });

  it("rounds up to retail PSU sizes", () => {
    expect(roundUpToPsuSize(400)).toBe(450);
    expect(roundUpToPsuSize(651)).toBe(750);
    expect(roundUpToPsuSize(1700)).toBe(1700);
  });
});

describe("estimatePerformance", () => {
  it("scores every use case for a complete build", () => {
    const perf = estimatePerformance(new BuildContext(goodAm5Build()));
    for (const score of Object.values(perf.scores)) {
      expect(score).not.toBeNull();
      expect(score!).toBeGreaterThanOrEqual(0);
      expect(score!).toBeLessThanOrEqual(100);
    }
    expect(perf.tier).toBe("high-end");
  });

  it("weights the GPU heavily for gaming and the CPU for productivity", () => {
    const fastGpu = estimatePerformance(
      new BuildContext(swap(goodAm5Build(), part("asus-tuf-gaming-geforce-rtx-5090-oc"))),
    );
    const fastCpu = estimatePerformance(
      new BuildContext(swap(goodAm5Build(), part("amd-ryzen-9-9950x"))),
    );
    const base = estimatePerformance(new BuildContext(goodAm5Build()));
    expect(fastGpu.scores.gaming! - base.scores.gaming!).toBeGreaterThan(
      fastGpu.scores.productivity! - base.scores.productivity!,
    );
    expect(fastCpu.scores.productivity! - base.scores.productivity!).toBeGreaterThan(
      fastCpu.scores.gaming! - base.scores.gaming!,
    );
  });

  it("uses integrated graphics when there is no GPU, and needs one otherwise", () => {
    expect(
      estimatePerformance(new BuildContext(without(goodAm5Build(), "gpu"))).scores.gaming,
    ).not.toBeNull();
    const noIgpu = swap(without(goodAm5Build(), "gpu"), part("amd-ryzen-5-5600"));
    expect(estimatePerformance(new BuildContext(noIgpu)).scores.gaming).toBeNull();
    expect(estimatePerformance(new BuildContext(noIgpu)).scores.home_office).not.toBeNull();
  });

  it("uses the requested use case for the tier", () => {
    const build = swap(
      swap(goodAm5Build(), part("amd-ryzen-5-5600")),
      part("asus-tuf-gaming-geforce-rtx-5090-oc"),
    );
    const gaming = evaluateBuild(build, { useCase: "gaming" }).performance;
    const office = evaluateBuild(build, { useCase: "home_office" }).performance;
    expect(gaming.tier).not.toBe(office.tier);
  });

  it("maps scores to tiers", () => {
    expect(tierForScore(10)).toBe("entry");
    expect(tierForScore(50)).toBe("mainstream");
    expect(tierForScore(78)).toBe("high-end");
    expect(tierForScore(90)).toBe("enthusiast");
  });
});

describe("estimateBottleneck", () => {
  it("flags a slow CPU with a fast GPU", () => {
    expect(estimateBottleneck(38, 100)).toMatchObject({ limitedBy: "cpu", risk: "high" });
    expect(estimateBottleneck(50, 80)).toMatchObject({ limitedBy: "cpu", risk: "medium" });
  });
  it("flags a weak GPU with a fast CPU", () => {
    expect(estimateBottleneck(92, 30)).toMatchObject({ limitedBy: "gpu", risk: "high" });
    expect(estimateBottleneck(86, 42)).toMatchObject({ limitedBy: "gpu", risk: "medium" });
  });
  it("is low risk when balanced and unknown without both parts", () => {
    expect(estimateBottleneck(74, 76)).toEqual({ limitedBy: null, risk: "low", message: null });
    expect(estimateBottleneck(74, null).risk).toBeNull();
  });
});

describe("toBuildComponent", () => {
  const row = {
    variantId: "v1",
    productId: "p1",
    name: "Test RAM",
    categorySlug: "memory",
    specs: {
      type: "DDR5",
      speedMts: 6000,
      modules: 2,
      moduleSizeGb: 16,
      casLatency: 30,
      voltage: 1.35,
      heightMm: 35,
      rgb: false,
      profile: "EXPO",
    },
  };

  it("parses specs and applies variant overrides", () => {
    const c = toBuildComponent({ ...row, specsOverride: { rgb: true }, quantity: 2 });
    expect(c.category).toBe("memory");
    expect(c.quantity).toBe(2);
    expect(c.specs).toMatchObject({ rgb: true, speedMts: 6000 });
  });

  it("rejects unknown categories and invalid specs", () => {
    expect(() => toBuildComponent({ ...row, categorySlug: "toaster" })).toThrow(
      InvalidComponentError,
    );
    expect(() => toBuildComponent({ ...row, specs: { ...row.specs, type: "DDR9" } })).toThrow(
      /Invalid memory specs/,
    );
  });
});
