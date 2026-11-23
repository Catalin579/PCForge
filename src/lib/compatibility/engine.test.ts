import { describe, expect, it } from "vitest";

import { type AnyBuildComponent, type CompatibilityReport } from "./types";
import { evaluateBuild, resolveRules } from "./engine";
import { RULE_DEFINITIONS, type RuleCode } from "./rule-definitions";
import { RULES } from "./rules";
import { goodAm5Build, part, swap, without } from "./test-fixtures";

const issuesFor = (report: CompatibilityReport, rule: RuleCode) =>
  report.issues.filter((i) => i.rule === rule);
const run = (build: AnyBuildComponent[]) => evaluateBuild(build);

function expectRule(
  build: AnyBuildComponent[],
  rule: RuleCode,
  severity?: "error" | "warning" | "info",
) {
  const found = issuesFor(run(build), rule);
  expect(found, `expected ${rule} to fire`).not.toHaveLength(0);
  if (severity) expect(found[0]!.severity).toBe(severity);
  return found;
}

function expectNoRule(build: AnyBuildComponent[], rule: RuleCode) {
  expect(issuesFor(run(build), rule), `expected ${rule} not to fire`).toHaveLength(0);
}

describe("rule registry", () => {
  it("implements every defined rule and nothing else", () => {
    expect(Object.keys(RULES).sort()).toEqual(RULE_DEFINITIONS.map((r) => r.code).sort());
  });
});

describe("a known-good build", () => {
  const report = run(goodAm5Build());

  it("is compatible with no errors or warnings", () => {
    expect(report.counts.error).toBe(0);
    expect(report.counts.warning).toBe(0);
    expect(report.status).toBe("compatible");
    expect(report.missingCategories).toEqual([]);
  });

  it("only notes that DDR5-6000 runs above the CPU's official speed with EXPO", () => {
    expect(report.issues.map((i) => i.rule)).toEqual(["memory.speed"]);
    expect(report.issues[0]!.severity).toBe("info");
  });
});

describe("status", () => {
  it("is empty with no parts", () => {
    const report = run([]);
    expect(report.status).toBe("empty");
    expect(report.issues).toEqual([]);
    expect(report.power.peakW).toBe(0);
  });

  it("is incomplete while core parts are missing", () => {
    const report = run([part("amd-ryzen-5-7600"), part("msi-b650-gaming-plus-wifi")]);
    expect(report.status).toBe("incomplete");
    expect(report.missingCategories).toEqual(["memory", "storage", "psu", "case"]);
  });

  it("is incompatible when any error exists, even if incomplete", () => {
    const report = run([part("amd-ryzen-5-5600"), part("msi-b650-gaming-plus-wifi")]);
    expect(report.status).toBe("incompatible");
  });

  it("is 'warnings' for a complete build with only warnings", () => {
    const report = run(
      swap(goodAm5Build(), part("deepcool-ak400", { specs: { tdpRatingW: 100 } })),
    );
    expect(report.counts.error).toBe(0);
    expect(report.status).toBe("warnings");
  });

  it("sorts errors first", () => {
    const build = swap(
      swap(goodAm5Build(), part("msi-mag-b550-tomahawk")),
      part("deepcool-ak400", { specs: { tdpRatingW: 100 } }),
    );
    const severities = run(build).issues.map((i) => i.severity);
    expect(severities).toEqual(
      [...severities].sort(
        (a, b) => ["error", "warning", "info"].indexOf(a) - ["error", "warning", "info"].indexOf(b),
      ),
    );
  });
});

describe("cpu_motherboard.socket", () => {
  it("passes when sockets match", () => expectNoRule(goodAm5Build(), "cpu_motherboard.socket"));
  it("fails AM4 CPU on AM5 board and suggests matching boards", () => {
    const [issue] = expectRule(
      swap(goodAm5Build(), part("amd-ryzen-5-5600")),
      "cpu_motherboard.socket",
      "error",
    );
    expect(issue!.message).toContain("AM4");
    expect(issue!.suggestion).toMatchObject({
      category: "motherboard",
      filters: { socket: "AM4" },
    });
    expect(issue!.categories.sort()).toEqual(["cpu", "motherboard"]);
  });
});

describe("memory_motherboard.type", () => {
  it("passes DDR5 on a DDR5 board", () => expectNoRule(goodAm5Build(), "memory_motherboard.type"));
  it("fails DDR4 on a DDR5 board", () => {
    const [issue] = expectRule(
      swap(goodAm5Build(), part("corsair-vengeance-lpx-ddr4-3200-cl16-32gb")),
      "memory_motherboard.type",
      "error",
    );
    expect(issue!.suggestion?.filters).toEqual({ type: "DDR5" });
  });
});

describe("memory_cpu.type", () => {
  it("passes when the CPU supports both DDR4 and DDR5", () => {
    const build = [part("intel-core-i5-14400f"), part("corsair-vengeance-lpx-ddr4-3200-cl16-32gb")];
    expectNoRule(build as AnyBuildComponent[], "memory_cpu.type");
  });
  it("fails DDR4 with a DDR5-only CPU", () => {
    expectRule(
      [
        part("amd-ryzen-7-7800x3d"),
        part("corsair-vengeance-lpx-ddr4-3200-cl16-32gb"),
      ] as AnyBuildComponent[],
      "memory_cpu.type",
      "error",
    );
  });
});

describe("memory_motherboard.slots", () => {
  it("passes two 2-module kits on a 4-slot board", () => {
    expectNoRule(
      swap(goodAm5Build(), part("kingston-fury-beast-ddr5-6000-cl30-32gb", { quantity: 2 })),
      "memory_motherboard.slots",
    );
  });
  it("fails two 2-module kits on a 2-slot Mini-ITX board", () => {
    const build = swap(
      swap(goodAm5Build(), part("asrock-b650i-lightning-wifi")),
      part("kingston-fury-beast-ddr5-6000-cl30-32gb", { quantity: 2 }),
    );
    const [issue] = expectRule(build, "memory_motherboard.slots", "error");
    expect(issue!.message).toContain("4 modules");
  });
});

describe("memory_motherboard.capacity", () => {
  it("passes within the board maximum", () =>
    expectNoRule(goodAm5Build(), "memory_motherboard.capacity"));
  it("fails above the board maximum", () => {
    const build = swap(
      swap(goodAm5Build(), part("asrock-b650i-lightning-wifi")),
      part("gskill-trident-z5-neo-rgb-ddr5-6000-cl30-64gb", { specs: { moduleSizeGb: 64 } }),
    );
    expectRule(build, "memory_motherboard.capacity", "error");
  });
});

describe("memory.speed", () => {
  it("passes when memory is within CPU and board limits", () => {
    expectNoRule(
      swap(goodAm5Build(), part("crucial-pro-ddr5-5600-cl46-32gb", { specs: { speedMts: 5200 } })),
      "memory.speed",
    );
  });
  it("is informational for an XMP/EXPO kit above the CPU's official speed", () => {
    expectRule(goodAm5Build(), "memory.speed", "info");
  });
  it("warns when a JEDEC kit exceeds the limit", () => {
    const [issue] = expectRule(
      swap(goodAm5Build(), part("crucial-pro-ddr5-5600-cl46-32gb")),
      "memory.speed",
      "warning",
    );
    expect(issue!.message).toContain("will run at 5200 MT/s");
  });
  it("warns when an XMP kit exceeds the motherboard limit", () => {
    const build = swap(
      goodAm5Build(),
      part("gskill-trident-z5-rgb-ddr5-6400-cl32-32gb", { specs: { speedMts: 8000 } }),
    );
    expectRule(build, "memory.speed", "warning");
  });
});

describe("memory.mixed_kits", () => {
  it("passes a single kit, even with quantity 2", () => {
    expectNoRule(
      swap(goodAm5Build(), part("kingston-fury-beast-ddr5-6000-cl30-32gb", { quantity: 2 })),
      "memory.mixed_kits",
    );
  });
  it("warns about two different kits", () => {
    const build = [
      ...goodAm5Build(),
      part("corsair-vengeance-ddr5-6000-cl36-32gb"),
    ] as AnyBuildComponent[];
    expectRule(build, "memory.mixed_kits", "warning");
  });
});

describe("motherboard_case.form_factor", () => {
  it("passes ATX in a mid tower", () =>
    expectNoRule(goodAm5Build(), "motherboard_case.form_factor"));
  it("fails ATX in a Mini-ITX case", () => {
    const [issue] = expectRule(
      swap(goodAm5Build(), part("cooler-master-nr200p-v2")),
      "motherboard_case.form_factor",
      "error",
    );
    expect(issue!.suggestion?.filters).toEqual({ supportedMotherboards: "ATX" });
  });
});

describe("gpu_case.length", () => {
  it("passes with plenty of clearance", () => expectNoRule(goodAm5Build(), "gpu_case.length"));
  it("fails a card longer than the case allows", () => {
    const build = swap(
      goodAm5Build(),
      part("asus-tuf-gaming-geforce-rtx-5090-oc", { specs: { lengthMm: 400 } }),
    );
    expectRule(build, "gpu_case.length", "error");
  });
  it("notes a tight fit", () => {
    const build = swap(
      goodAm5Build(),
      part("sapphire-pulse-radeon-rx-9070-xt", { specs: { lengthMm: 385 } }),
    );
    const [issue] = expectRule(build, "gpu_case.length", "info");
    expect(issue!.message).toContain("7 mm to spare");
  });
  it("respects a tuned tightClearanceMm param", () => {
    const build = swap(
      goodAm5Build(),
      part("sapphire-pulse-radeon-rx-9070-xt", { specs: { lengthMm: 385 } }),
    );
    const report = evaluateBuild(build, {
      rules: [
        {
          code: "gpu_case.length",
          severity: "error",
          isActive: true,
          params: { tightClearanceMm: 5 },
        },
      ],
    });
    expect(issuesFor(report, "gpu_case.length")).toHaveLength(0);
  });
});

describe("cooler_cpu.socket", () => {
  it("passes a multi-socket cooler", () => expectNoRule(goodAm5Build(), "cooler_cpu.socket"));
  it("fails an AM-only cooler on Intel", () => {
    const build = [
      part("intel-core-ultra-7-265k"),
      part("noctua-nh-l9a-am5"),
    ] as AnyBuildComponent[];
    expectRule(build, "cooler_cpu.socket", "error");
  });
});

describe("cooler_cpu.tdp", () => {
  it("passes a cooler rated above the CPU's power", () =>
    expectNoRule(goodAm5Build(), "cooler_cpu.tdp"));
  it("warns when the cooler is underrated", () => {
    const build = swap(goodAm5Build(), part("noctua-nh-l9a-am5"));
    const [issue] = expectRule(build, "cooler_cpu.tdp", "warning");
    expect(issue!.suggestion?.filters).toEqual({ minTdpRatingW: 162 });
  });
});

describe("cooler_case.height", () => {
  it("passes when the cooler fits", () => expectNoRule(goodAm5Build(), "cooler_case.height"));
  it("fails a tall cooler in a small case", () => {
    const build = swap(
      swap(
        swap(goodAm5Build(), part("asrock-b650i-lightning-wifi")),
        part("cooler-master-nr200p-v2"),
      ),
      part("noctua-nh-d15-g2"),
    );
    expectRule(build, "cooler_case.height", "error");
  });
  it("ignores liquid coolers", () => {
    expectNoRule(swap(goodAm5Build(), part("arctic-liquid-freezer-iii-360")), "cooler_case.height");
  });
});

describe("cooler_case.radiator", () => {
  it("passes a 360 mm radiator in a case with a 360 mm mount", () => {
    expectNoRule(
      swap(goodAm5Build(), part("arctic-liquid-freezer-iii-360")),
      "cooler_case.radiator",
    );
  });
  it("fails a 360 mm radiator in a case that tops out at 280 mm", () => {
    const build = swap(
      swap(goodAm5Build(), part("fractal-design-pop-mini-air")),
      part("arctic-liquid-freezer-iii-360"),
    );
    const [issue] = expectRule(build, "cooler_case.radiator", "error");
    expect(issue!.message).toContain("240, 280");
  });
  it("ignores air coolers", () => expectNoRule(goodAm5Build(), "cooler_case.radiator"));
});

describe("cpu.cooler_required", () => {
  it("passes when the CPU includes a cooler", () => {
    expectNoRule(
      without(swap(goodAm5Build(), part("amd-ryzen-5-7600")), "cpu-cooler"),
      "cpu.cooler_required",
    );
  });
  it("warns when a box-without-cooler CPU has no cooler", () => {
    const report = run(without(goodAm5Build(), "cpu-cooler"));
    expect(issuesFor(report, "cpu.cooler_required")[0]?.severity).toBe("warning");
    expect(report.missingCategories).toContain("cpu-cooler");
    expect(report.status).toBe("incomplete");
  });
});

describe("cpu.display_output", () => {
  it("passes when the CPU has integrated graphics", () => {
    expectNoRule(without(goodAm5Build(), "gpu"), "cpu.display_output");
  });
  it("fails a complete build with no GPU and no iGPU", () => {
    const build = without(
      [
        part("amd-ryzen-5-5600"),
        part("msi-mag-b550-tomahawk"),
        part("corsair-vengeance-lpx-ddr4-3200-cl16-32gb"),
        part("samsung-990-pro-2tb"),
        part("msi-mag-a650bn"),
        part("corsair-4000d-airflow"),
      ] as AnyBuildComponent[],
      "gpu",
    );
    const report = run(build);
    expect(issuesFor(report, "cpu.display_output")[0]?.severity).toBe("error");
    expect(report.missingCategories).toEqual(["gpu"]);
  });
  it("stays quiet while the core build is still being assembled", () => {
    expectNoRule([part("amd-ryzen-5-5600")] as AnyBuildComponent[], "cpu.display_output");
  });
});

describe("psu.capacity and psu.headroom", () => {
  it("pass with a comfortably sized PSU", () => {
    expectNoRule(goodAm5Build(), "psu.capacity");
    expectNoRule(goodAm5Build(), "psu.headroom");
  });
  it("fail capacity when peak draw exceeds the PSU, without also warning about headroom", () => {
    const build = swap(
      swap(goodAm5Build(), part("asus-tuf-gaming-geforce-rtx-5090-oc")),
      part("msi-mag-a650bn"),
    );
    const report = run(build);
    expect(issuesFor(report, "psu.capacity")[0]?.severity).toBe("error");
    expect(issuesFor(report, "psu.capacity")[0]?.suggestion?.filters).toEqual({ minWattage: 1200 });
    expect(issuesFor(report, "psu.headroom")).toHaveLength(0);
  });
  it("warn about headroom below the GPU maker's recommendation", () => {
    const build = swap(
      swap(goodAm5Build(), part("msi-geforce-rtx-5080-ventus-3x-oc")),
      part("corsair-rm750e-2025"),
    );
    const [issue] = expectRule(build, "psu.headroom", "warning");
    expect(issue!.message).toContain("850 W");
  });
  it("use the admin-tuned headroom ratio", () => {
    const report = evaluateBuild(goodAm5Build(), {
      rules: [
        {
          code: "psu.headroom",
          severity: "warning",
          isActive: true,
          params: { headroomRatio: 0.9 },
        },
      ],
    });
    expect(issuesFor(report, "psu.headroom")).toHaveLength(1);
    expect(report.power.recommendedPsuW).toBe(1200);
  });
});

describe("psu_gpu.connectors", () => {
  it("passes when the PSU has the native connectors", () => {
    expectNoRule(
      swap(goodAm5Build(), part("asus-prime-geforce-rtx-5070-oc")),
      "psu_gpu.connectors",
    );
  });
  it("warns when a 12V-2x6 card needs an adapter the PSU can feed", () => {
    const build = swap(
      swap(goodAm5Build(), part("asus-prime-geforce-rtx-5070-oc")),
      part("corsair-sf750-platinum"),
    );
    const [issue] = expectRule(build, "psu_gpu.connectors", "warning");
    expect(issue!.message).toContain("adapter");
  });
  it("errors when there are not enough cables even for an adapter", () => {
    const build = swap(
      swap(goodAm5Build(), part("asus-prime-geforce-rtx-5070-oc")),
      part("msi-mag-a650bn", {
        specs: { connectors: { eps8pin: 1, pcie8pin: 1, "12v2x6": 0, sata: 5 } },
      }),
    );
    expectRule(build, "psu_gpu.connectors", "error");
  });
  it("errors when the PSU has too few 8-pin connectors", () => {
    const build = swap(
      goodAm5Build(),
      part("corsair-rm850x-2024", {
        specs: { connectors: { eps8pin: 2, pcie8pin: 1, "12v2x6": 1, sata: 8 } },
      }),
    );
    const [issue] = expectRule(build, "psu_gpu.connectors", "error");
    expect(issue!.message).toContain("2 PCIe 8-pin connectors");
  });
  it("lets an admin pin the severity for every finding", () => {
    const build = swap(
      goodAm5Build(),
      part("corsair-rm850x-2024", {
        specs: { connectors: { eps8pin: 2, pcie8pin: 1, "12v2x6": 1, sata: 8 } },
      }),
    );
    const report = evaluateBuild(build, {
      rules: [{ code: "psu_gpu.connectors", severity: "info", isActive: true, params: {} }],
    });
    expect(issuesFor(report, "psu_gpu.connectors")[0]?.severity).toBe("info");
  });
});

describe("psu_motherboard.eps", () => {
  it("passes when the PSU has enough EPS connectors", () =>
    expectNoRule(goodAm5Build(), "psu_motherboard.eps"));
  it("warns when the board has more EPS sockets than the PSU", () => {
    const build = swap(goodAm5Build(), part("msi-mag-a650bn"));
    expectRule(build, "psu_motherboard.eps", "warning");
  });
  it("errors when the PSU has no EPS connector", () => {
    const build = swap(
      goodAm5Build(),
      part("msi-mag-a650bn", {
        specs: { connectors: { eps8pin: 0, pcie8pin: 2, "12v2x6": 0, sata: 5 } },
      }),
    );
    expectRule(build, "psu_motherboard.eps", "error");
  });
});

describe("psu_case.form_factor", () => {
  it("passes ATX in an ATX case", () => expectNoRule(goodAm5Build(), "psu_case.form_factor"));
  it("notes an SFX unit in an ATX case", () => {
    expectRule(
      swap(goodAm5Build(), part("corsair-sf750-platinum")),
      "psu_case.form_factor",
      "info",
    );
  });
  it("fails an ATX unit in an SFX-only case", () => {
    const build = swap(
      swap(goodAm5Build(), part("asrock-b650i-lightning-wifi")),
      part("cooler-master-nr200p-v2"),
    );
    expectRule(build, "psu_case.form_factor", "error");
  });
  it("fails a PSU longer than the case allows", () => {
    // NZXT H5 Flow fits PSUs up to 180 mm.
    const build = swap(
      swap(goodAm5Build(), part("nzxt-h5-flow-2024")),
      part("be-quiet-dark-power-13-1000w", { specs: { lengthMm: 200 } }),
    );
    const [issue] = expectRule(build, "psu_case.form_factor", "error");
    expect(issue!.message).toContain("200 mm");
  });
});

describe("storage rules", () => {
  it("assign M.2 drives to free slots", () => {
    expectNoRule(
      swap(goodAm5Build(), part("samsung-990-pro-2tb", { quantity: 2 })),
      "storage_motherboard.m2_slots",
    );
  });
  it("fail when there are more M.2 drives than slots", () => {
    const build = swap(goodAm5Build(), part("samsung-990-pro-2tb", { quantity: 3 }));
    expectRule(build, "storage_motherboard.m2_slots", "error");
  });
  it("note a PCIe 5.0 drive in a board without Gen5 M.2", () => {
    const [issue] = expectRule(
      swap(goodAm5Build(), part("samsung-9100-pro-2tb")),
      "storage_motherboard.m2_speed",
      "info",
    );
    expect(issue!.message).toContain("PCIe 4.0 x4");
  });
  it("put a PCIe 5.0 drive in the Gen5 slot when the board has one", () => {
    const build = swap(
      swap(goodAm5Build(), part("asus-tuf-gaming-b650-plus-wifi")),
      part("samsung-9100-pro-2tb"),
    );
    expectNoRule(build, "storage_motherboard.m2_speed");
  });
  it("keep the Gen5 slot for the Gen5 drive when a Gen4 drive is also present", () => {
    const build = [
      ...swap(goodAm5Build(), part("asus-tuf-gaming-b650-plus-wifi")),
      part("samsung-9100-pro-2tb"),
    ] as AnyBuildComponent[];
    expectNoRule(build, "storage_motherboard.m2_speed");
  });
  it("count SATA ports", () => {
    expectNoRule(
      [...goodAm5Build(), part("seagate-barracuda-2tb", { quantity: 4 })] as AnyBuildComponent[],
      "storage_motherboard.sata_ports",
    );
    expectRule(
      [...goodAm5Build(), part("seagate-barracuda-2tb", { quantity: 5 })] as AnyBuildComponent[],
      "storage_motherboard.sata_ports",
      "error",
    );
  });
  it('count drive bays, letting spare 3.5" bays hold 2.5" drives', () => {
    // Lancool 216: 4 x 2.5" and 2 x 3.5" bays.
    expectNoRule(
      [...goodAm5Build(), part("samsung-870-evo-1tb", { quantity: 6 })] as AnyBuildComponent[],
      "storage_case.bays",
    );
    expectRule(
      [...goodAm5Build(), part("samsung-870-evo-1tb", { quantity: 7 })] as AnyBuildComponent[],
      "storage_case.bays",
      "warning",
    );
    expectRule(
      [...goodAm5Build(), part("wd-blue-4tb", { quantity: 3 })] as AnyBuildComponent[],
      "storage_case.bays",
      "warning",
    );
  });
});

describe("build.required_components", () => {
  it("lists missing core parts", () => {
    const [issue] = expectRule(
      [part("amd-ryzen-5-7600")] as AnyBuildComponent[],
      "build.required_components",
      "info",
    );
    expect(issue!.message).toBe("Still needed: motherboard, memory, storage, psu, case.");
  });
  it("is silent for a complete build", () =>
    expectNoRule(goodAm5Build(), "build.required_components"));
});

describe("rule configuration", () => {
  it("skips disabled rules", () => {
    const report = evaluateBuild(swap(goodAm5Build(), part("amd-ryzen-5-5600")), {
      rules: [{ code: "cpu_motherboard.socket", severity: "error", isActive: false, params: {} }],
    });
    expect(issuesFor(report, "cpu_motherboard.socket")).toHaveLength(0);
  });
  it("applies severity overrides", () => {
    const report = evaluateBuild(swap(goodAm5Build(), part("amd-ryzen-5-5600")), {
      rules: [{ code: "cpu_motherboard.socket", severity: "warning", isActive: true, params: {} }],
    });
    expect(issuesFor(report, "cpu_motherboard.socket")[0]?.severity).toBe("warning");
  });
  it("ignores unknown rule codes and falls back to defaults", () => {
    const rules = resolveRules([
      { code: "made.up", severity: "error", isActive: true, params: {} },
    ]);
    expect(rules).toHaveLength(RULE_DEFINITIONS.length);
    expect(rules.every((r) => r.isActive)).toBe(true);
  });
});
