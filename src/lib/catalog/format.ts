/**
 * Human-readable spec labels and summaries for product cards and tables.
 * Works on loosely typed spec objects so it never throws on old data.
 */
import { type CategorySlug } from "./specs";

type Specs = Record<string, unknown>;
type Row = { label: string; value: string };

const num = (v: unknown, unit = "") =>
  typeof v === "number" ? `${v.toLocaleString("en")}${unit}` : null;
const bool = (v: unknown) => (typeof v === "boolean" ? (v ? "Yes" : "No") : null);
const list = (v: unknown) => (Array.isArray(v) ? v.join(", ") : null);
const str = (v: unknown) => (typeof v === "string" ? v : null);

function capacity(gb: unknown): string | null {
  if (typeof gb !== "number") return null;
  return gb >= 1000 ? `${(gb / 1000).toLocaleString("en")} TB` : `${gb} GB`;
}

const ROWS: Record<CategorySlug, Array<[string, (s: Specs) => string | null]>> = {
  cpu: [
    ["Socket", (s) => str(s.socket)],
    ["Architecture", (s) => str(s.architecture)],
    ["Cores / threads", (s) => (s.cores && s.threads ? `${s.cores} / ${s.threads}` : null)],
    [
      "Base / boost clock",
      (s) =>
        s.baseClockGhz && s.boostClockGhz ? `${s.baseClockGhz} / ${s.boostClockGhz} GHz` : null,
    ],
    ["L3 cache", (s) => num(s.l3CacheMb, " MB")],
    ["TDP / max power", (s) => (s.tdpW && s.maxPowerW ? `${s.tdpW} W / ${s.maxPowerW} W` : null)],
    [
      "Memory",
      (s) =>
        Array.isArray(s.memoryTypes)
          ? `${s.memoryTypes.join(", ")} up to ${s.maxMemorySpeedMts} MT/s`
          : null,
    ],
    ["Integrated graphics", (s) => bool(s.integratedGraphics)],
    ["Cooler included", (s) => bool(s.coolerIncluded)],
    ["PCIe", (s) => str(s.pcieVersion)],
  ],
  motherboard: [
    ["Socket", (s) => str(s.socket)],
    ["Chipset", (s) => str(s.chipset)],
    ["Form factor", (s) => str(s.formFactor)],
    [
      "Memory",
      (s) =>
        s.memoryType
          ? `${s.memoryType}, ${s.memorySlots} slots, up to ${s.maxMemoryGb} GB at ${s.maxMemorySpeedMts} MT/s`
          : null,
    ],
    [
      "M.2 slots",
      (s) =>
        Array.isArray(s.m2Slots)
          ? `${s.m2Slots.length} (${(s.m2Slots as Array<{ interface: string }>).map((m) => m.interface.replace(" x4", "")).join(", ")})`
          : null,
    ],
    ["SATA ports", (s) => num(s.sataPorts)],
    ["PCIe x16 slots", (s) => num(s.pcieX16Slots)],
    ["CPU power", (s) => num(s.epsConnectors, " x 8-pin EPS")],
    [
      "Wi-Fi / Bluetooth",
      (s) =>
        typeof s.wifi === "boolean"
          ? `${s.wifi ? "Yes" : "No"} / ${s.bluetooth ? "Yes" : "No"}`
          : null,
    ],
  ],
  memory: [
    ["Type", (s) => str(s.type)],
    ["Speed", (s) => num(s.speedMts, " MT/s")],
    ["Kit", (s) => (s.modules && s.moduleSizeGb ? `${s.modules} x ${s.moduleSizeGb} GB` : null)],
    ["CAS latency", (s) => (s.casLatency ? `CL${s.casLatency}` : null)],
    ["Voltage", (s) => num(s.voltage, " V")],
    ["Height", (s) => num(s.heightMm, " mm")],
    ["Profile", (s) => str(s.profile)],
    ["RGB", (s) => bool(s.rgb)],
  ],
  gpu: [
    ["Chipset", (s) => str(s.chipset)],
    ["Memory", (s) => (s.vramGb ? `${s.vramGb} GB ${s.memoryType ?? ""}`.trim() : null)],
    ["Length", (s) => num(s.lengthMm, " mm")],
    ["Slot width", (s) => num(s.slotWidth, " slots")],
    ["Board power", (s) => num(s.boardPowerW, " W")],
    ["Recommended PSU", (s) => num(s.recommendedPsuW, " W")],
    [
      "Power connectors",
      (s) =>
        Array.isArray(s.powerConnectors)
          ? (s.powerConnectors as Array<{ type: string; count: number }>)
              .map((c) => `${c.count} x ${c.type}`)
              .join(", ") || "None"
          : null,
    ],
    ["Interface", (s) => str(s.pcieInterface)],
    ["Outputs", (s) => list(s.outputs)],
  ],
  storage: [
    ["Type", (s) => str(s.type)],
    ["Capacity", (s) => capacity(s.capacityGb)],
    ["Form factor", (s) => (s.m2Size ? `${s.formFactor} ${s.m2Size}` : str(s.formFactor))],
    ["Interface", (s) => str(s.interface)],
    ["Read / write", (s) => (s.readMbs && s.writeMbs ? `${s.readMbs} / ${s.writeMbs} MB/s` : null)],
    ["DRAM cache", (s) => bool(s.hasDram)],
    ["Spindle speed", (s) => num(s.rpm, " rpm")],
    ["Endurance", (s) => num(s.tbw, " TBW")],
  ],
  psu: [
    ["Wattage", (s) => num(s.wattage, " W")],
    ["Efficiency", (s) => str(s.efficiency)],
    ["Modular", (s) => str(s.modular)],
    ["Form factor", (s) => str(s.formFactor)],
    ["ATX version", (s) => str(s.atxVersion)],
    ["Length", (s) => num(s.lengthMm, " mm")],
    [
      "Connectors",
      (s) => {
        const c = s.connectors as Record<string, number> | undefined;
        return c
          ? `${c.eps8pin} x EPS 8-pin, ${c.pcie8pin} x PCIe 8-pin, ${c["12v2x6"]} x 12V-2x6, ${c.sata} x SATA`
          : null;
      },
    ],
  ],
  case: [
    ["Type", (s) => str(s.type)],
    ["Motherboards", (s) => list(s.supportedMotherboards)],
    ["Max GPU length", (s) => num(s.maxGpuLengthMm, " mm")],
    ["Max cooler height", (s) => num(s.maxCpuCoolerHeightMm, " mm")],
    [
      "PSU",
      (s) =>
        Array.isArray(s.psuFormFactors)
          ? `${s.psuFormFactors.join(", ")} up to ${s.maxPsuLengthMm} mm`
          : null,
    ],
    [
      "Radiators",
      (s) => {
        const r = s.radiatorSupport as Record<string, number[]> | undefined;
        if (!r) return null;
        const parts = Object.entries(r)
          .filter(([, v]) => v.length)
          .map(([k, v]) => `${k} ${v.join("/")}`);
        return parts.length ? parts.join("; ") + " mm" : "None";
      },
    ],
    [
      "Drive bays",
      (s) =>
        s.driveBays25 !== undefined ? `${s.driveBays25} x 2.5", ${s.driveBays35} x 3.5"` : null,
    ],
    ["Included fans", (s) => num(s.includedFans)],
    ["Side panel", (s) => str(s.sidePanel)],
  ],
  "cpu-cooler": [
    ["Type", (s) => (s.type === "aio" ? "Liquid (AIO)" : s.type === "air" ? "Air" : null)],
    ["Sockets", (s) => list(s.sockets)],
    ["Height", (s) => num(s.heightMm, " mm")],
    ["Radiator", (s) => num(s.radiatorMm, " mm")],
    ["Rated for", (s) => num(s.tdpRatingW, " W")],
    ["Fans", (s) => num(s.fans)],
    ["Noise", (s) => num(s.noiseDba, " dBA")],
  ],
  "case-fan": [
    ["Size", (s) => num(s.sizeMm, " mm")],
    ["Pack", (s) => num(s.packSize, " fans")],
    ["Max speed", (s) => num(s.maxRpm, " rpm")],
    ["Airflow", (s) => num(s.airflowCfm, " CFM")],
    ["Noise", (s) => num(s.noiseDba, " dBA")],
    ["Connector", (s) => str(s.connector)],
    ["RGB", (s) => bool(s.rgb)],
  ],
  monitor: [
    ["Size", (s) => num(s.sizeInches, '"')],
    ["Resolution", (s) => str(s.resolution)?.replace("x", " x ") ?? null],
    ["Refresh rate", (s) => num(s.refreshRateHz, " Hz")],
    ["Panel", (s) => str(s.panel)],
    ["Response time", (s) => num(s.responseTimeMs, " ms")],
    ["Adaptive sync", (s) => list(s.adaptiveSync)],
    ["HDR", (s) => str(s.hdr)],
    ["Inputs", (s) => list(s.inputs)],
  ],
  keyboard: [
    ["Layout", (s) => str(s.layout)],
    ["Switches", (s) => str(s.switchType)],
    ["Connection", (s) => list(s.connection)],
    ["RGB", (s) => bool(s.rgb)],
  ],
  mouse: [
    ["Sensor", (s) => str(s.sensor)],
    ["Max DPI", (s) => num(s.maxDpi)],
    ["Weight", (s) => num(s.weightG, " g")],
    ["Connection", (s) => list(s.connection)],
    ["Buttons", (s) => num(s.buttons)],
  ],
  headset: [
    ["Connection", (s) => list(s.connection)],
    ["Microphone", (s) => bool(s.microphone)],
    ["Surround", (s) => bool(s.surround)],
    ["Weight", (s) => num(s.weightG, " g")],
  ],
};

export function specRows(category: CategorySlug, specs: Specs): Row[] {
  return (ROWS[category] ?? [])
    .map(([label, fn]) => {
      try {
        return { label, value: fn(specs) };
      } catch {
        return { label, value: null };
      }
    })
    .filter((r): r is Row => Boolean(r.value));
}

/** Three or four key specs for a product card. */
export function specSummary(category: CategorySlug, specs: Specs): string {
  const keys: Partial<Record<CategorySlug, string[]>> = {
    cpu: ["Socket", "Cores / threads", "Base / boost clock"],
    motherboard: ["Socket", "Form factor", "Chipset"],
    memory: ["Kit", "Speed", "CAS latency"],
    gpu: ["Memory", "Length", "Board power"],
    storage: ["Capacity", "Interface", "Read / write"],
    psu: ["Wattage", "Efficiency", "Modular"],
    case: ["Type", "Max GPU length", "Max cooler height"],
    "cpu-cooler": ["Type", "Height", "Radiator", "Rated for"],
    "case-fan": ["Size", "Pack", "Airflow"],
    monitor: ["Size", "Resolution", "Refresh rate", "Panel"],
  };
  const wanted = keys[category];
  const rows = specRows(category, specs);
  return (wanted ? rows.filter((r) => wanted.includes(r.label)) : rows.slice(0, 3))
    .map((r) => r.value)
    .join(" · ");
}

export const STOCK_LABELS: Record<string, string> = {
  in_stock: "In stock",
  low_stock: "Low stock",
  out_of_stock: "Out of stock",
  preorder: "Pre-order",
  backorder: "Backorder",
  unknown: "Stock unknown",
};

export function deliveryLabel(min: number | null, max: number | null): string | null {
  if (min === null && max === null) return null;
  if (min !== null && max !== null && min !== max) return `${min}–${max} days`;
  const d = max ?? min!;
  return d === 1 ? "1 day" : `${d} days`;
}
