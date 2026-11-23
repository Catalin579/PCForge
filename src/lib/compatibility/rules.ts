/**
 * Implementations of every compatibility rule in rule-definitions.ts.
 *
 * A rule looks at the build and returns zero or more findings. The engine
 * adds the rule's title and configured severity; a finding may override the
 * severity when one rule covers cases of different weight (e.g. a missing
 * 8-pin connector is worse than needing a 12V-2x6 adapter).
 */
import { type CategorySlug, type StorageSpecs } from "@/lib/catalog/specs";

import { type BuildContext } from "./build-context";
import { type RuleCode } from "./rule-definitions";
import {
  type BuildComponent,
  type CompatibilityIssue,
  type PowerEstimate,
  type Severity,
  type Suggestion,
} from "./types";

export type Finding = {
  message: string;
  components: Array<{ id: string; category: CategorySlug }>;
  severity?: Severity;
  suggestion?: Suggestion;
};

export type RuleInput = {
  ctx: BuildContext;
  params: Record<string, unknown>;
  power: PowerEstimate;
};

export type RuleImpl = (input: RuleInput) => Finding[];

/** Core categories every working desktop needs (GPU and cooler are handled by their own rules). */
export const REQUIRED_CATEGORIES: CategorySlug[] = [
  "cpu",
  "motherboard",
  "memory",
  "storage",
  "psu",
  "case",
];

const ref = (c: BuildComponent) => ({ id: c.id, category: c.category });

function numberParam(params: Record<string, unknown>, key: string, fallback: number): number {
  const v = params[key];
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

const INTERFACE_SPEED: Record<StorageSpecs["interface"], number> = {
  SATA: 0,
  "PCIe 3.0 x4": 1,
  "PCIe 4.0 x4": 2,
  "PCIe 5.0 x4": 3,
};

export type M2Assignment = {
  drive: BuildComponent<"storage">;
  slotIndex: number | null;
  /** Slot interface when it is slower than the drive. */
  limitedTo: StorageSpecs["interface"] | null;
};

/**
 * Assign M.2 drives to motherboard M.2 slots. Fastest drives pick first and
 * take the slowest slot that still runs them at full speed, which leaves fast
 * slots for fast drives. Drives that fit no free slot get `slotIndex: null`.
 */
export function assignM2Slots(ctx: BuildContext): M2Assignment[] {
  const board = ctx.one("motherboard");
  const drives = ctx
    .all("storage")
    .filter((d) => d.specs.formFactor === "M.2")
    .flatMap((d) => Array.from({ length: d.quantity }, () => d))
    .sort((a, b) => INTERFACE_SPEED[b.specs.interface] - INTERFACE_SPEED[a.specs.interface]);
  if (!board) return drives.map((drive) => ({ drive, slotIndex: null, limitedTo: null }));

  const slots = board.specs.m2Slots.map((slot, index) => ({ ...slot, index, used: false }));

  return drives.map((drive) => {
    const size = drive.specs.m2Size ?? "2280";
    const isSata = drive.specs.interface === "SATA";
    const driveSpeed = INTERFACE_SPEED[drive.specs.interface];
    const fits = slots.filter(
      (s) =>
        !s.used && s.sizes.includes(size) && (isSata ? s.supportsSata : s.interface !== "SATA"),
    );
    if (fits.length === 0) return { drive, slotIndex: null, limitedTo: null };

    const fullSpeed = fits
      .filter((s) => isSata || INTERFACE_SPEED[s.interface] >= driveSpeed)
      .sort((a, b) => INTERFACE_SPEED[a.interface] - INTERFACE_SPEED[b.interface]);
    const chosen =
      fullSpeed[0] ??
      [...fits].sort((a, b) => INTERFACE_SPEED[b.interface] - INTERFACE_SPEED[a.interface])[0]!;
    chosen.used = true;
    const limited = !isSata && INTERFACE_SPEED[chosen.interface] < driveSpeed;
    return { drive, slotIndex: chosen.index, limitedTo: limited ? chosen.interface : null };
  });
}

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

export const RULES: Record<RuleCode, RuleImpl> = {
  "cpu_motherboard.socket": ({ ctx }) => {
    const cpu = ctx.one("cpu");
    const board = ctx.one("motherboard");
    if (!cpu || !board || cpu.specs.socket === board.specs.socket) return [];
    return [
      {
        message: `${cpu.name} uses socket ${cpu.specs.socket}, but ${board.name} has socket ${board.specs.socket}.`,
        components: [ref(cpu), ref(board)],
        suggestion: {
          message: `Choose a motherboard with socket ${cpu.specs.socket}.`,
          category: "motherboard",
          filters: { socket: cpu.specs.socket },
        },
      },
    ];
  },

  "memory_motherboard.type": ({ ctx }) => {
    const board = ctx.one("motherboard");
    if (!board) return [];
    return ctx
      .all("memory")
      .filter((m) => m.specs.type !== board.specs.memoryType)
      .map((m) => ({
        message: `${m.name} is ${m.specs.type}, but ${board.name} only takes ${board.specs.memoryType}.`,
        components: [ref(m), ref(board)],
        suggestion: {
          message: `Choose ${board.specs.memoryType} memory.`,
          category: "memory",
          filters: { type: board.specs.memoryType },
        },
      }));
  },

  "memory_cpu.type": ({ ctx }) => {
    const cpu = ctx.one("cpu");
    if (!cpu) return [];
    return ctx
      .all("memory")
      .filter((m) => !cpu.specs.memoryTypes.includes(m.specs.type))
      .map((m) => ({
        message: `${cpu.name} supports ${cpu.specs.memoryTypes.join(" and ")}, not ${m.specs.type}.`,
        components: [ref(m), ref(cpu)],
        suggestion: {
          message: `Choose ${cpu.specs.memoryTypes.join(" or ")} memory.`,
          category: "memory",
          filters: { type: cpu.specs.memoryTypes },
        },
      }));
  },

  "memory_motherboard.slots": ({ ctx }) => {
    const board = ctx.one("motherboard");
    const memory = ctx.all("memory");
    if (!board || memory.length === 0) return [];
    const modules = memory.reduce((n, m) => n + m.specs.modules * m.quantity, 0);
    if (modules <= board.specs.memorySlots) return [];
    return [
      {
        message: `The memory adds up to ${plural(modules, "module")}, but ${board.name} has ${plural(board.specs.memorySlots, "slot")}.`,
        components: [...memory.map(ref), ref(board)],
        suggestion: {
          message:
            "Use fewer, larger modules, for example a 2-module kit with the capacity you need.",
          category: "memory",
          filters: { modules: board.specs.memorySlots >= 2 ? 2 : 1 },
        },
      },
    ];
  },

  "memory_motherboard.capacity": ({ ctx }) => {
    const board = ctx.one("motherboard");
    const memory = ctx.all("memory");
    if (!board || memory.length === 0) return [];
    const totalGb = memory.reduce(
      (n, m) => n + m.specs.modules * m.specs.moduleSizeGb * m.quantity,
      0,
    );
    if (totalGb <= board.specs.maxMemoryGb) return [];
    return [
      {
        message: `${totalGb} GB of memory is more than ${board.name} supports (${board.specs.maxMemoryGb} GB).`,
        components: [...memory.map(ref), ref(board)],
      },
    ];
  },

  "memory.speed": ({ ctx }) => {
    const cpu = ctx.one("cpu");
    const board = ctx.one("motherboard");
    const limits = [
      cpu && { name: cpu.name, max: cpu.specs.maxMemorySpeedMts },
      board && { name: board.name, max: board.specs.maxMemorySpeedMts },
    ].filter(Boolean) as Array<{ name: string; max: number }>;
    if (limits.length === 0) return [];
    const limit = limits.reduce((a, b) => (b.max < a.max ? b : a));
    return ctx
      .all("memory")
      .filter((m) => m.specs.speedMts > limit.max)
      .map((m) => {
        const usesProfile = m.specs.profile !== "JEDEC";
        const exceedsBoard =
          board !== undefined && m.specs.speedMts > board.specs.maxMemorySpeedMts;
        return {
          // Running above the CPU's official speed with XMP/EXPO is normal and
          // usually fine, so that case is informational. Exceeding the board's
          // limit means the speed may simply not be reachable.
          severity: usesProfile && !exceedsBoard ? ("info" as const) : undefined,
          message: usesProfile
            ? `${m.name} is rated ${m.specs.speedMts} MT/s; ${limit.name} officially supports up to ${limit.max} MT/s. Enable ${m.specs.profile} in the BIOS to run it faster than stock; stability above the official speed is not guaranteed.`
            : `${m.name} is rated ${m.specs.speedMts} MT/s but will run at ${limit.max} MT/s, the most ${limit.name} supports.`,
          components: [ref(m), ...(cpu ? [ref(cpu)] : []), ...(board ? [ref(board)] : [])],
        };
      });
  },

  "memory.mixed_kits": ({ ctx }) => {
    const memory = ctx.all("memory");
    const distinct = new Set(memory.map((m) => m.id));
    if (distinct.size <= 1) return [];
    return [
      {
        message:
          "Different memory kits are mixed. They may not run at their rated speed together. A single kit is more reliable.",
        components: memory.map(ref),
      },
    ];
  },

  "motherboard_case.form_factor": ({ ctx }) => {
    const board = ctx.one("motherboard");
    const pcCase = ctx.one("case");
    if (!board || !pcCase || pcCase.specs.supportedMotherboards.includes(board.specs.formFactor))
      return [];
    return [
      {
        message: `${pcCase.name} fits ${pcCase.specs.supportedMotherboards.join(", ")} boards, but ${board.name} is ${board.specs.formFactor}.`,
        components: [ref(board), ref(pcCase)],
        suggestion: {
          message: `Choose a case that supports ${board.specs.formFactor}.`,
          category: "case",
          filters: { supportedMotherboards: board.specs.formFactor },
        },
      },
    ];
  },

  "gpu_case.length": ({ ctx, params }) => {
    const gpu = ctx.one("gpu");
    const pcCase = ctx.one("case");
    if (!gpu || !pcCase) return [];
    const max = pcCase.specs.maxGpuLengthMm;
    const length = gpu.specs.lengthMm;
    const tight = numberParam(params, "tightClearanceMm", 10);
    if (length > max) {
      return [
        {
          message: `${gpu.name} is ${length} mm long; ${pcCase.name} fits cards up to ${max} mm.`,
          components: [ref(gpu), ref(pcCase)],
          suggestion: {
            message: `Choose a case with at least ${length} mm of GPU clearance, or a shorter card.`,
            category: "case",
            filters: { minGpuLengthMm: length },
          },
        },
      ];
    }
    if (max - length < tight) {
      return [
        {
          severity: "info",
          message: `${gpu.name} fits ${pcCase.name} with only ${max - length} mm to spare. Front fans or a radiator can reduce the space.`,
          components: [ref(gpu), ref(pcCase)],
        },
      ];
    }
    return [];
  },

  "cooler_cpu.socket": ({ ctx }) => {
    const cpu = ctx.one("cpu");
    const cooler = ctx.one("cpu-cooler");
    if (!cpu || !cooler || cooler.specs.sockets.includes(cpu.specs.socket)) return [];
    return [
      {
        message: `${cooler.name} supports ${cooler.specs.sockets.join(", ")}, not ${cpu.specs.socket}.`,
        components: [ref(cooler), ref(cpu)],
        suggestion: {
          message: `Choose a cooler that supports ${cpu.specs.socket}.`,
          category: "cpu-cooler",
          filters: { sockets: cpu.specs.socket },
        },
      },
    ];
  },

  "cooler_cpu.tdp": ({ ctx }) => {
    const cpu = ctx.one("cpu");
    const cooler = ctx.one("cpu-cooler");
    if (!cpu || !cooler || cooler.specs.tdpRatingW >= cpu.specs.maxPowerW) return [];
    return [
      {
        message: `${cooler.name} is rated for about ${cooler.specs.tdpRatingW} W, but ${cpu.name} can draw up to ${cpu.specs.maxPowerW} W. Expect higher temperatures and lower boost clocks under heavy load.`,
        components: [ref(cooler), ref(cpu)],
        suggestion: {
          message: `Choose a cooler rated for at least ${cpu.specs.maxPowerW} W.`,
          category: "cpu-cooler",
          filters: { minTdpRatingW: cpu.specs.maxPowerW },
        },
      },
    ];
  },

  "cooler_case.height": ({ ctx }) => {
    const cooler = ctx.one("cpu-cooler");
    const pcCase = ctx.one("case");
    if (!cooler || !pcCase || cooler.specs.type !== "air") return [];
    if (cooler.specs.heightMm <= pcCase.specs.maxCpuCoolerHeightMm) return [];
    return [
      {
        message: `${cooler.name} is ${cooler.specs.heightMm} mm tall; ${pcCase.name} fits coolers up to ${pcCase.specs.maxCpuCoolerHeightMm} mm.`,
        components: [ref(cooler), ref(pcCase)],
        suggestion: {
          message: `Choose a cooler no taller than ${pcCase.specs.maxCpuCoolerHeightMm} mm, or a liquid cooler.`,
          category: "cpu-cooler",
          filters: { maxHeightMm: pcCase.specs.maxCpuCoolerHeightMm },
        },
      },
    ];
  },

  "cooler_case.radiator": ({ ctx }): Finding[] => {
    const cooler = ctx.one("cpu-cooler");
    const pcCase = ctx.one("case");
    if (!cooler || !pcCase || cooler.specs.type !== "aio") return [];
    const size = cooler.specs.radiatorMm;
    const r = pcCase.specs.radiatorSupport;
    const positions = (["front", "top", "side", "rear"] as const).filter((p) =>
      r[p].includes(size),
    );
    if (positions.length > 0) return [];
    const supported = [...new Set([...r.front, ...r.top, ...r.side, ...r.rear])].sort(
      (a, b) => a - b,
    );
    return [
      {
        message: `${pcCase.name} has no mounting position for a ${size} mm radiator${supported.length ? ` (supports ${supported.join(", ")} mm)` : ""}.`,
        components: [ref(cooler), ref(pcCase)],
        suggestion: supported.length
          ? {
              message: `Choose a ${supported.at(-1)} mm or smaller liquid cooler, or an air cooler.`,
              category: "cpu-cooler",
              filters: { radiatorMm: supported },
            }
          : {
              message: "Choose an air cooler for this case.",
              category: "cpu-cooler",
              filters: { type: "air" },
            },
      },
    ];
  },

  "cpu.cooler_required": ({ ctx }) => {
    const cpu = ctx.one("cpu");
    if (!cpu || cpu.specs.coolerIncluded || ctx.has("cpu-cooler")) return [];
    return [
      {
        message: `${cpu.name} does not come with a cooler. Add a CPU cooler.`,
        components: [ref(cpu)],
        suggestion: {
          message: `Coolers for ${cpu.specs.socket} rated for at least ${cpu.specs.maxPowerW} W.`,
          category: "cpu-cooler",
          filters: { sockets: cpu.specs.socket, minTdpRatingW: cpu.specs.maxPowerW },
        },
      },
    ];
  },

  "cpu.display_output": ({ ctx }) => {
    const cpu = ctx.one("cpu");
    // Only meaningful once the rest of the core build is in place; earlier it
    // is just a part not picked yet (reported via missingCategories).
    const coreComplete = REQUIRED_CATEGORIES.every((c) => ctx.has(c));
    if (!cpu || cpu.specs.integratedGraphics || ctx.has("gpu") || !coreComplete) return [];
    return [
      {
        message: `${cpu.name} has no integrated graphics, so this build has no display output. Add a graphics card.`,
        components: [ref(cpu)],
        suggestion: { message: "Add a graphics card.", category: "gpu" },
      },
    ];
  },

  "psu.capacity": ({ ctx, power }) => {
    const psu = ctx.one("psu");
    if (!psu || power.peakW <= psu.specs.wattage) return [];
    return [
      {
        message: `The build can draw about ${power.peakW} W at full load, more than ${psu.name} delivers (${psu.specs.wattage} W).`,
        components: [ref(psu)],
        suggestion: {
          message: `Choose a power supply of at least ${power.recommendedPsuW} W.`,
          category: "psu",
          filters: { minWattage: power.recommendedPsuW },
        },
      },
    ];
  },

  "psu.headroom": ({ ctx, power, params }) => {
    const psu = ctx.one("psu");
    // Capacity errors are reported by psu.capacity; don't double up.
    if (!psu || power.peakW > psu.specs.wattage) return [];
    const ratio = numberParam(params, "headroomRatio", 0.3);
    const gpu = ctx.one("gpu");
    const gpuMin = gpu?.specs.recommendedPsuW ?? 0;
    const needed = Math.max(gpuMin, Math.ceil(power.peakW * (1 + ratio)));
    if (psu.specs.wattage >= needed) return [];
    const reason =
      gpu && psu.specs.wattage < gpuMin
        ? `${gpu.name} calls for at least ${gpuMin} W.`
        : `It leaves less than ${Math.round(ratio * 100)} % headroom above the estimated ${power.peakW} W peak.`;
    return [
      {
        message: `${psu.name} (${psu.specs.wattage} W) is on the small side. ${reason}`,
        components: [ref(psu), ...(gpu ? [ref(gpu)] : [])],
        suggestion: {
          message: `A ${power.recommendedPsuW} W unit is recommended.`,
          category: "psu",
          filters: { minWattage: power.recommendedPsuW },
        },
      },
    ];
  },

  "psu_gpu.connectors": ({ ctx }) => {
    const psu = ctx.one("psu");
    const gpu = ctx.one("gpu");
    if (!psu || !gpu) return [];
    const need = { eightPin: 0, highPower: 0 };
    for (const c of gpu.specs.powerConnectors) {
      // A 6+2-pin PCIe cable serves both 6-pin and 8-pin sockets.
      if (c.type === "12V-2x6") need.highPower += c.count;
      else need.eightPin += c.count;
    }
    const have = {
      eightPin: psu.specs.connectors.pcie8pin,
      highPower: psu.specs.connectors["12v2x6"],
    };
    const findings: Finding[] = [];

    if (need.highPower > have.highPower) {
      // A 12V-2x6 adapter needs two to four 8-pin cables (2 per 300 W).
      const adapterCables = Math.max(2, Math.min(4, Math.ceil(gpu.specs.boardPowerW / 150)));
      const spare = have.eightPin - need.eightPin;
      findings.push(
        spare >= adapterCables
          ? {
              message: `${gpu.name} uses a 12V-2x6 (16-pin) connector, which ${psu.name} lacks. It can run through the adapter included with most cards using ${adapterCables} PCIe 8-pin cables, but a native cable is cleaner and safer.`,
              components: [ref(psu), ref(gpu)],
              suggestion: {
                message: "Prefer an ATX 3.x power supply with a native 12V-2x6 cable.",
                category: "psu",
                filters: { has12v2x6: true },
              },
            }
          : {
              severity: "error",
              message: `${gpu.name} needs a 12V-2x6 (16-pin) connector. ${psu.name} has neither that nor the ${adapterCables} PCIe 8-pin cables an adapter needs.`,
              components: [ref(psu), ref(gpu)],
              suggestion: {
                message: "Choose an ATX 3.x power supply with a native 12V-2x6 cable.",
                category: "psu",
                filters: { has12v2x6: true },
              },
            },
      );
    }
    if (need.eightPin > have.eightPin) {
      findings.push({
        severity: "error",
        message: `${gpu.name} needs ${plural(need.eightPin, "PCIe 8-pin connector")}; ${psu.name} has ${have.eightPin}.`,
        components: [ref(psu), ref(gpu)],
        suggestion: {
          message: `Choose a power supply with at least ${need.eightPin} PCIe 8-pin connectors.`,
          category: "psu",
          filters: { minPcie8pin: need.eightPin },
        },
      });
    }
    return findings;
  },

  "psu_motherboard.eps": ({ ctx }) => {
    const psu = ctx.one("psu");
    const board = ctx.one("motherboard");
    if (!psu || !board || psu.specs.connectors.eps8pin >= board.specs.epsConnectors) return [];
    if (psu.specs.connectors.eps8pin === 0) {
      return [
        {
          severity: "error",
          message: `${psu.name} has no 8-pin EPS CPU power connector, which ${board.name} requires.`,
          components: [ref(psu), ref(board)],
        },
      ];
    }
    return [
      {
        message: `${board.name} has ${board.specs.epsConnectors} CPU power connectors; ${psu.name} provides ${psu.specs.connectors.eps8pin}. One is enough for most CPUs, but high-power chips and overclocking benefit from both.`,
        components: [ref(psu), ref(board)],
      },
    ];
  },

  "psu_case.form_factor": ({ ctx }) => {
    const psu = ctx.one("psu");
    const pcCase = ctx.one("case");
    if (!psu || !pcCase) return [];
    const findings: Finding[] = [];
    const accepted = pcCase.specs.psuFormFactors;
    if (!accepted.includes(psu.specs.formFactor)) {
      const sfxInAtx = psu.specs.formFactor.startsWith("SFX") && accepted.includes("ATX");
      findings.push(
        sfxInAtx
          ? {
              severity: "info",
              message: `${psu.name} is ${psu.specs.formFactor}; ${pcCase.name} is built for ATX units. It fits with an SFX-to-ATX bracket (often included with the PSU).`,
              components: [ref(psu), ref(pcCase)],
            }
          : {
              message: `${pcCase.name} takes ${accepted.join(" or ")} power supplies; ${psu.name} is ${psu.specs.formFactor}.`,
              components: [ref(psu), ref(pcCase)],
              suggestion: {
                message: `Choose a ${accepted.join(" or ")} power supply.`,
                category: "psu",
                filters: { formFactor: [...accepted] },
              },
            },
      );
    }
    if (psu.specs.lengthMm > pcCase.specs.maxPsuLengthMm) {
      findings.push({
        message: `${psu.name} is ${psu.specs.lengthMm} mm long; ${pcCase.name} fits power supplies up to ${pcCase.specs.maxPsuLengthMm} mm.`,
        components: [ref(psu), ref(pcCase)],
        suggestion: {
          message: `Choose a power supply no longer than ${pcCase.specs.maxPsuLengthMm} mm.`,
          category: "psu",
          filters: { maxLengthMm: pcCase.specs.maxPsuLengthMm },
        },
      });
    }
    return findings;
  },

  "storage_motherboard.m2_slots": ({ ctx }) => {
    const board = ctx.one("motherboard");
    if (!board) return [];
    const unassigned = assignM2Slots(ctx).filter((a) => a.slotIndex === null);
    if (unassigned.length === 0) return [];
    const drives = [...new Map(unassigned.map((a) => [a.drive.id, a.drive])).values()];
    const total = ctx
      .all("storage")
      .filter((d) => d.specs.formFactor === "M.2")
      .reduce((n, d) => n + d.quantity, 0);
    return [
      {
        message: `${board.name} has ${plural(board.specs.m2Slots.length, "M.2 slot")}, but the build has ${plural(total, "M.2 drive")}${unassigned.length < total ? " (or a drive doesn't fit the free slots)" : ""}.`,
        components: [...drives.map(ref), ref(board)],
        suggestion: {
          message: 'Use a 2.5" SATA SSD for extra storage, or a board with more M.2 slots.',
          category: "storage",
          filters: { formFactor: '2.5"' },
        },
      },
    ];
  },

  "storage_motherboard.m2_speed": ({ ctx }) => {
    const board = ctx.one("motherboard");
    if (!board) return [];
    return assignM2Slots(ctx)
      .filter((a) => a.limitedTo !== null)
      .map((a) => ({
        message: `${a.drive.name} is a ${a.drive.specs.interface} drive, but the free slot on ${board.name} runs at ${a.limitedTo}. It works, at lower peak speed.`,
        components: [ref(a.drive), ref(board)],
      }));
  },

  "storage_motherboard.sata_ports": ({ ctx }) => {
    const board = ctx.one("motherboard");
    if (!board) return [];
    const sataDrives = ctx.all("storage").filter((d) => d.specs.formFactor !== "M.2");
    const count = sataDrives.reduce((n, d) => n + d.quantity, 0);
    if (count <= board.specs.sataPorts) return [];
    return [
      {
        message: `The build has ${plural(count, "SATA drive")}, but ${board.name} has ${plural(board.specs.sataPorts, "SATA port")}.`,
        components: [...sataDrives.map(ref), ref(board)],
        suggestion: {
          message: "Replace some drives with larger ones or with M.2 drives.",
          category: "storage",
        },
      },
    ];
  },

  "storage_case.bays": ({ ctx }) => {
    const pcCase = ctx.one("case");
    if (!pcCase) return [];
    const drives = ctx.all("storage");
    const n35 = drives
      .filter((d) => d.specs.formFactor === '3.5"')
      .reduce((n, d) => n + d.quantity, 0);
    const n25 = drives
      .filter((d) => d.specs.formFactor === '2.5"')
      .reduce((n, d) => n + d.quantity, 0);
    const findings: Finding[] = [];
    if (n35 > pcCase.specs.driveBays35) {
      findings.push({
        message: `${pcCase.name} has ${plural(pcCase.specs.driveBays35, '3.5" bay')} for ${plural(n35, '3.5" drive')}.`,
        components: [...drives.filter((d) => d.specs.formFactor === '3.5"').map(ref), ref(pcCase)],
      });
    }
    // Unused 3.5" bays also take 2.5" drives.
    const spare35 = Math.max(0, pcCase.specs.driveBays35 - n35);
    if (n25 > pcCase.specs.driveBays25 + spare35) {
      findings.push({
        message: `${pcCase.name} has room for ${plural(pcCase.specs.driveBays25 + spare35, '2.5" drive')}, but the build has ${n25}.`,
        components: [...drives.filter((d) => d.specs.formFactor === '2.5"').map(ref), ref(pcCase)],
      });
    }
    return findings;
  },

  "build.required_components": ({ ctx }) => {
    if (ctx.isEmpty) return [];
    const missing = REQUIRED_CATEGORIES.filter((c) => !ctx.has(c));
    if (missing.length === 0) return [];
    return [
      {
        message: `Still needed: ${missing.join(", ")}.`,
        components: [],
      },
    ];
  },
};

export function toIssue(
  code: RuleCode,
  title: string,
  severity: Severity,
  finding: Finding,
): CompatibilityIssue {
  return {
    rule: code,
    severity: finding.severity ?? severity,
    title,
    message: finding.message,
    componentIds: [...new Set(finding.components.map((c) => c.id))],
    categories: [...new Set(finding.components.map((c) => c.category))],
    ...(finding.suggestion ? { suggestion: finding.suggestion } : {}),
  };
}
