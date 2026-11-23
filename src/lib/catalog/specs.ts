/**
 * Technical specification schemas, one per component category.
 *
 * `products.specs` is JSONB in the database. These schemas are the single
 * source of truth for its shape: the seed script, admin forms and server
 * actions validate against them, and the compatibility engine reads the
 * parsed result. Keep keys camelCase and units in the key name (Mm, W, Gb).
 */
import { z } from "zod";

export const CPU_SOCKETS = ["AM4", "AM5", "LGA1700", "LGA1851"] as const;
export const MEMORY_TYPES = ["DDR4", "DDR5"] as const;
export const MOTHERBOARD_FORM_FACTORS = ["E-ATX", "ATX", "Micro-ATX", "Mini-ITX"] as const;
export const PSU_FORM_FACTORS = ["ATX", "SFX", "SFX-L"] as const;
export const M2_SIZES = ["2230", "2242", "2260", "2280", "22110"] as const;
export const STORAGE_INTERFACES = ["PCIe 3.0 x4", "PCIe 4.0 x4", "PCIe 5.0 x4", "SATA"] as const;
export const GPU_POWER_CONNECTORS = ["6-pin", "8-pin", "12V-2x6"] as const;
export const RADIATOR_SIZES = [120, 140, 240, 280, 360, 420] as const;

export const cpuSocketSchema = z.enum(CPU_SOCKETS);
export const memoryTypeSchema = z.enum(MEMORY_TYPES);
export const motherboardFormFactorSchema = z.enum(MOTHERBOARD_FORM_FACTORS);
export const psuFormFactorSchema = z.enum(PSU_FORM_FACTORS);
export const storageInterfaceSchema = z.enum(STORAGE_INTERFACES);
export const radiatorSizeSchema = z.union(RADIATOR_SIZES.map((s) => z.literal(s)));

const positiveInt = z.number().int().positive();
const nonNegativeInt = z.number().int().nonnegative();

export const cpuSpecsSchema = z.object({
  socket: cpuSocketSchema,
  architecture: z.string().min(1),
  cores: positiveInt,
  threads: positiveInt,
  baseClockGhz: z.number().positive(),
  boostClockGhz: z.number().positive(),
  l3CacheMb: positiveInt,
  tdpW: positiveInt,
  /** Sustained package power under full load (PPT / PL2). */
  maxPowerW: positiveInt,
  memoryTypes: z.array(memoryTypeSchema).min(1),
  maxMemorySpeedMts: positiveInt,
  integratedGraphics: z.boolean(),
  coolerIncluded: z.boolean(),
  pcieVersion: z.enum(["4.0", "5.0"]),
});

export const m2SlotSchema = z.object({
  /** Fastest interface the slot runs at; most M.2 slots also accept slower drives. */
  interface: storageInterfaceSchema,
  sizes: z.array(z.enum(M2_SIZES)).min(1),
  /** Some slots accept SATA M.2 drives as well as NVMe. */
  supportsSata: z.boolean(),
});

export const motherboardSpecsSchema = z.object({
  socket: cpuSocketSchema,
  chipset: z.string().min(1),
  formFactor: motherboardFormFactorSchema,
  memoryType: memoryTypeSchema,
  memorySlots: positiveInt,
  maxMemoryGb: positiveInt,
  maxMemorySpeedMts: positiveInt,
  m2Slots: z.array(m2SlotSchema),
  sataPorts: nonNegativeInt,
  pcieX16Slots: positiveInt,
  /** Number of 8-pin EPS CPU power connectors on the board. */
  epsConnectors: positiveInt,
  wifi: z.boolean(),
  bluetooth: z.boolean(),
});

export const memorySpecsSchema = z.object({
  type: memoryTypeSchema,
  speedMts: positiveInt,
  modules: positiveInt,
  moduleSizeGb: positiveInt,
  casLatency: positiveInt,
  voltage: z.number().positive(),
  heightMm: positiveInt,
  rgb: z.boolean(),
  profile: z.enum(["XMP", "EXPO", "XMP/EXPO", "JEDEC"]),
});

export const gpuSpecsSchema = z.object({
  chipset: z.string().min(1),
  chipsetMaker: z.enum(["NVIDIA", "AMD", "Intel"]),
  vramGb: positiveInt,
  memoryType: z.string().min(1),
  lengthMm: positiveInt,
  /** Expansion slots occupied (2, 2.5, 3...). */
  slotWidth: z.number().positive(),
  boardPowerW: positiveInt,
  recommendedPsuW: positiveInt,
  powerConnectors: z
    .array(z.object({ type: z.enum(GPU_POWER_CONNECTORS), count: positiveInt }))
    .default([]),
  pcieInterface: z.enum(["PCIe 4.0 x16", "PCIe 4.0 x8", "PCIe 5.0 x16", "PCIe 5.0 x8"]),
  outputs: z.array(z.string()).default([]),
});

export const storageSpecsSchema = z.object({
  type: z.enum(["SSD", "HDD"]),
  formFactor: z.enum(["M.2", '2.5"', '3.5"']),
  /** For M.2 drives only. */
  m2Size: z.enum(M2_SIZES).optional(),
  interface: storageInterfaceSchema,
  capacityGb: positiveInt,
  readMbs: positiveInt,
  writeMbs: positiveInt,
  hasDram: z.boolean().optional(),
  rpm: positiveInt.optional(),
  tbw: positiveInt.optional(),
});

export const psuSpecsSchema = z.object({
  wattage: positiveInt,
  efficiency: z.enum([
    "80+ White",
    "80+ Bronze",
    "80+ Silver",
    "80+ Gold",
    "80+ Platinum",
    "80+ Titanium",
  ]),
  modular: z.enum(["Full", "Semi", "No"]),
  formFactor: psuFormFactorSchema,
  atxVersion: z.enum(["2.x", "3.0", "3.1"]),
  lengthMm: positiveInt,
  connectors: z.object({
    eps8pin: nonNegativeInt,
    pcie8pin: nonNegativeInt,
    "12v2x6": nonNegativeInt,
    sata: nonNegativeInt,
  }),
});

export const caseSpecsSchema = z.object({
  type: z.enum(["Full Tower", "Mid Tower", "Micro Tower", "Mini-ITX", "Small Form Factor"]),
  supportedMotherboards: z.array(motherboardFormFactorSchema).min(1),
  maxGpuLengthMm: positiveInt,
  maxCpuCoolerHeightMm: positiveInt,
  maxPsuLengthMm: positiveInt,
  psuFormFactors: z.array(psuFormFactorSchema).min(1),
  expansionSlots: positiveInt,
  radiatorSupport: z.object({
    front: z.array(radiatorSizeSchema).default([]),
    top: z.array(radiatorSizeSchema).default([]),
    rear: z.array(radiatorSizeSchema).default([]),
    side: z.array(radiatorSizeSchema).default([]),
  }),
  driveBays25: nonNegativeInt,
  driveBays35: nonNegativeInt,
  includedFans: nonNegativeInt,
  sidePanel: z.enum(["Tempered Glass", "Mesh", "Solid", "Acrylic"]),
});

export const coolerSpecsSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("air"),
    sockets: z.array(cpuSocketSchema).min(1),
    heightMm: positiveInt,
    tdpRatingW: positiveInt,
    fans: positiveInt,
    noiseDba: z.number().positive().optional(),
  }),
  z.object({
    type: z.literal("aio"),
    sockets: z.array(cpuSocketSchema).min(1),
    radiatorMm: radiatorSizeSchema,
    tdpRatingW: positiveInt,
    fans: positiveInt,
    noiseDba: z.number().positive().optional(),
  }),
]);

export const fanSpecsSchema = z.object({
  sizeMm: z.union([z.literal(120), z.literal(140)]),
  packSize: positiveInt,
  maxRpm: positiveInt,
  airflowCfm: z.number().positive(),
  noiseDba: z.number().positive(),
  connector: z.enum(["3-pin", "4-pin PWM"]),
  rgb: z.boolean(),
});

export const monitorSpecsSchema = z.object({
  sizeInches: z.number().positive(),
  resolution: z.string().regex(/^\d+x\d+$/),
  refreshRateHz: positiveInt,
  panel: z.enum(["IPS", "VA", "TN", "OLED", "QD-OLED"]),
  responseTimeMs: z.number().positive(),
  adaptiveSync: z.array(z.enum(["G-SYNC", "G-SYNC Compatible", "FreeSync", "FreeSync Premium", "FreeSync Premium Pro"])),
  hdr: z.string().optional(),
  inputs: z.array(z.string()).default([]),
});

export const keyboardSpecsSchema = z.object({
  layout: z.enum(["Full", "TKL", "75%", "65%", "60%"]),
  switchType: z.string().min(1),
  connection: z.array(z.enum(["Wired", "2.4 GHz", "Bluetooth"])).min(1),
  rgb: z.boolean(),
});

export const mouseSpecsSchema = z.object({
  sensor: z.string().min(1),
  maxDpi: positiveInt,
  weightG: positiveInt,
  connection: z.array(z.enum(["Wired", "2.4 GHz", "Bluetooth"])).min(1),
  buttons: positiveInt,
});

export const headsetSpecsSchema = z.object({
  connection: z.array(z.enum(["Wired 3.5mm", "USB", "2.4 GHz", "Bluetooth"])).min(1),
  microphone: z.boolean(),
  surround: z.boolean(),
  weightG: positiveInt,
});

/** Category slug → spec schema. Must match the rows in `public.categories`. */
export const specSchemas = {
  cpu: cpuSpecsSchema,
  motherboard: motherboardSpecsSchema,
  memory: memorySpecsSchema,
  gpu: gpuSpecsSchema,
  storage: storageSpecsSchema,
  psu: psuSpecsSchema,
  case: caseSpecsSchema,
  "cpu-cooler": coolerSpecsSchema,
  "case-fan": fanSpecsSchema,
  monitor: monitorSpecsSchema,
  keyboard: keyboardSpecsSchema,
  mouse: mouseSpecsSchema,
  headset: headsetSpecsSchema,
} as const;

export type CategorySlug = keyof typeof specSchemas;
export const CATEGORY_SLUGS = Object.keys(specSchemas) as CategorySlug[];

export type CpuSpecs = z.infer<typeof cpuSpecsSchema>;
export type MotherboardSpecs = z.infer<typeof motherboardSpecsSchema>;
export type MemorySpecs = z.infer<typeof memorySpecsSchema>;
export type GpuSpecs = z.infer<typeof gpuSpecsSchema>;
export type StorageSpecs = z.infer<typeof storageSpecsSchema>;
export type PsuSpecs = z.infer<typeof psuSpecsSchema>;
export type CaseSpecs = z.infer<typeof caseSpecsSchema>;
export type CoolerSpecs = z.infer<typeof coolerSpecsSchema>;
export type FanSpecs = z.infer<typeof fanSpecsSchema>;
export type MonitorSpecs = z.infer<typeof monitorSpecsSchema>;
export type KeyboardSpecs = z.infer<typeof keyboardSpecsSchema>;
export type MouseSpecs = z.infer<typeof mouseSpecsSchema>;
export type HeadsetSpecs = z.infer<typeof headsetSpecsSchema>;

export type SpecsFor<C extends CategorySlug> = z.infer<(typeof specSchemas)[C]>;

export function isCategorySlug(value: string): value is CategorySlug {
  return value in specSchemas;
}

/** Validate raw JSON specs for a category. Throws a ZodError on bad input. */
export function parseSpecs<C extends CategorySlug>(category: C, specs: unknown): SpecsFor<C> {
  return specSchemas[category].parse(specs) as SpecsFor<C>;
}

/** Non-throwing variant for request handlers and forms. */
export function safeParseSpecs<C extends CategorySlug>(category: C, specs: unknown) {
  return specSchemas[category].safeParse(specs);
}
