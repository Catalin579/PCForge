/**
 * Catalog filters: how URL search params map to the search_products RPC.
 *
 * Param names match the `filters` keys in compatibility suggestions
 * (src/lib/compatibility/rules.ts), so a suggestion like
 * { category: "motherboard", filters: { socket: "AM5" } } becomes
 * /catalog/motherboard?socket=AM5 with no translation.
 */
import { z } from "zod";

import {
  CPU_SOCKETS,
  MEMORY_TYPES,
  MOTHERBOARD_FORM_FACTORS,
  PSU_FORM_FACTORS,
  RADIATOR_SIZES,
  STORAGE_INTERFACES,
  type CategorySlug,
} from "./specs";

type SpecQuery = {
  specs?: Record<string, unknown>;
  any?: Record<string, Array<string | number>>;
  ranges?: Record<string, { min?: number; max?: number }>;
};

export type SpecFilter = {
  param: string;
  label: string;
  /** Shown in the filter sidebar; hidden filters still work from links. */
  visible: boolean;
  kind: "select" | "number" | "boolean";
  options?: ReadonlyArray<string | number>;
  unit?: string;
  toQuery: (values: string[]) => SpecQuery;
};

const eq = (specKey: string) => (values: string[]): SpecQuery =>
  values.length === 1 ? { specs: { [specKey]: values[0] } } : { any: { [specKey]: values } };
const eqNumber = (specKey: string) => (values: string[]): SpecQuery => ({
  any: { [specKey]: values.map(Number).filter(Number.isFinite) },
});
/** The spec is an array that must contain the value, e.g. cooler sockets. */
const contains = (specKey: string) => (values: string[]): SpecQuery => ({ specs: { [specKey]: values.slice(0, 1) } });
const min = (specKey: string) => (values: string[]): SpecQuery => ({ ranges: { [specKey]: { min: Number(values[0]) } } });
const max = (specKey: string) => (values: string[]): SpecQuery => ({ ranges: { [specKey]: { max: Number(values[0]) } } });
const flag = (specKey: string, value: unknown) => (values: string[]): SpecQuery =>
  values[0] === "true" ? { specs: { [specKey]: value } } : {};

export const SPEC_FILTERS: Partial<Record<CategorySlug, SpecFilter[]>> = {
  cpu: [
    { param: "socket", label: "Socket", visible: true, kind: "select", options: CPU_SOCKETS, toQuery: eq("socket") },
    { param: "minCores", label: "Min. cores", visible: true, kind: "number", toQuery: min("cores") },
    { param: "integratedGraphics", label: "Integrated graphics", visible: true, kind: "boolean", toQuery: flag("integratedGraphics", true) },
    { param: "coolerIncluded", label: "Cooler included", visible: true, kind: "boolean", toQuery: flag("coolerIncluded", true) },
  ],
  motherboard: [
    { param: "socket", label: "Socket", visible: true, kind: "select", options: CPU_SOCKETS, toQuery: eq("socket") },
    { param: "memoryType", label: "Memory type", visible: true, kind: "select", options: MEMORY_TYPES, toQuery: eq("memoryType") },
    { param: "formFactor", label: "Form factor", visible: true, kind: "select", options: MOTHERBOARD_FORM_FACTORS, toQuery: eq("formFactor") },
    { param: "wifi", label: "Wi-Fi", visible: true, kind: "boolean", toQuery: flag("wifi", true) },
  ],
  memory: [
    { param: "type", label: "Type", visible: true, kind: "select", options: MEMORY_TYPES, toQuery: eq("type") },
    { param: "modules", label: "Modules", visible: true, kind: "select", options: [1, 2, 4], toQuery: eqNumber("modules") },
    { param: "minSpeedMts", label: "Min. speed", unit: "MT/s", visible: true, kind: "number", toQuery: min("speedMts") },
    { param: "maxHeightMm", label: "Max. height", unit: "mm", visible: false, kind: "number", toQuery: max("heightMm") },
  ],
  gpu: [
    { param: "chipsetMaker", label: "Chipset", visible: true, kind: "select", options: ["NVIDIA", "AMD", "Intel"], toQuery: eq("chipsetMaker") },
    { param: "minVramGb", label: "Min. VRAM", unit: "GB", visible: true, kind: "number", toQuery: min("vramGb") },
    { param: "maxLengthMm", label: "Max. length", unit: "mm", visible: true, kind: "number", toQuery: max("lengthMm") },
  ],
  storage: [
    { param: "type", label: "Type", visible: true, kind: "select", options: ["SSD", "HDD"], toQuery: eq("type") },
    { param: "formFactor", label: "Form factor", visible: true, kind: "select", options: ["M.2", '2.5"', '3.5"'], toQuery: eq("formFactor") },
    { param: "interface", label: "Interface", visible: true, kind: "select", options: STORAGE_INTERFACES, toQuery: eq("interface") },
    { param: "minCapacityGb", label: "Min. capacity", unit: "GB", visible: true, kind: "number", toQuery: min("capacityGb") },
  ],
  psu: [
    { param: "minWattage", label: "Min. wattage", unit: "W", visible: true, kind: "number", toQuery: min("wattage") },
    { param: "formFactor", label: "Form factor", visible: true, kind: "select", options: PSU_FORM_FACTORS, toQuery: eq("formFactor") },
    { param: "has12v2x6", label: "Native 12V-2x6", visible: true, kind: "boolean", toQuery: (v) => (v[0] === "true" ? { ranges: { "connectors.12v2x6": { min: 1 } } } : {}) },
    { param: "minPcie8pin", label: "Min. PCIe 8-pin", visible: false, kind: "number", toQuery: min("connectors.pcie8pin") },
    { param: "maxLengthMm", label: "Max. length", unit: "mm", visible: false, kind: "number", toQuery: max("lengthMm") },
  ],
  case: [
    { param: "supportedMotherboards", label: "Fits motherboard", visible: true, kind: "select", options: MOTHERBOARD_FORM_FACTORS, toQuery: contains("supportedMotherboards") },
    { param: "minGpuLengthMm", label: "Min. GPU clearance", unit: "mm", visible: true, kind: "number", toQuery: min("maxGpuLengthMm") },
    { param: "minCoolerHeightMm", label: "Min. cooler clearance", unit: "mm", visible: true, kind: "number", toQuery: min("maxCpuCoolerHeightMm") },
  ],
  "cpu-cooler": [
    { param: "type", label: "Type", visible: true, kind: "select", options: ["air", "aio"], toQuery: eq("type") },
    { param: "sockets", label: "Socket", visible: true, kind: "select", options: CPU_SOCKETS, toQuery: contains("sockets") },
    { param: "minTdpRatingW", label: "Min. rated TDP", unit: "W", visible: true, kind: "number", toQuery: min("tdpRatingW") },
    { param: "maxHeightMm", label: "Max. height", unit: "mm", visible: false, kind: "number", toQuery: max("heightMm") },
    { param: "radiatorMm", label: "Radiator", unit: "mm", visible: false, kind: "select", options: RADIATOR_SIZES, toQuery: eqNumber("radiatorMm") },
  ],
  "case-fan": [
    { param: "sizeMm", label: "Size", unit: "mm", visible: true, kind: "select", options: [120, 140], toQuery: eqNumber("sizeMm") },
  ],
  monitor: [
    { param: "panel", label: "Panel", visible: true, kind: "select", options: ["IPS", "VA", "OLED"], toQuery: eq("panel") },
    { param: "minRefreshRateHz", label: "Min. refresh rate", unit: "Hz", visible: true, kind: "number", toQuery: min("refreshRateHz") },
  ],
};

export const SORT_OPTIONS = [
  { value: "relevance", label: "Best match" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "performance", label: "Performance" },
  { value: "newest", label: "Newest" },
  { value: "name", label: "Name" },
] as const;

export type SortOption = (typeof SORT_OPTIONS)[number]["value"];

export const PAGE_SIZE = 24;

const baseParamsSchema = z.object({
  q: z.string().trim().max(100).optional(),
  brand: z.array(z.string().regex(/^[a-z0-9-]+$/)).max(20).default([]),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  inStock: z.enum(["true"]).optional(),
  retailer: z.string().regex(/^[a-z0-9-]+$/).optional(),
  sort: z.enum(SORT_OPTIONS.map((s) => s.value) as [SortOption, ...SortOption[]]).optional(),
  page: z.coerce.number().int().min(1).max(500).default(1),
});

export type CatalogParams = z.infer<typeof baseParamsSchema> & {
  specFilters: Record<string, string[]>;
};

type RawParams = Record<string, string | string[] | undefined>;

const asArray = (v: string | string[] | undefined) => (v === undefined ? [] : Array.isArray(v) ? v : [v]);

/** Parse and validate URL search params; unknown or invalid params are dropped. */
export function parseCatalogParams(raw: RawParams, category: CategorySlug | null): CatalogParams {
  const first = (k: string) => asArray(raw[k])[0] || undefined;
  const parsed = baseParamsSchema.safeParse({
    q: first("q"),
    brand: asArray(raw.brand).flatMap((b) => b.split(",")).filter(Boolean),
    minPrice: first("minPrice"),
    maxPrice: first("maxPrice"),
    inStock: first("inStock"),
    retailer: first("retailer"),
    sort: first("sort"),
    page: first("page"),
  });
  const base = parsed.success ? parsed.data : baseParamsSchema.parse({});

  const specFilters: Record<string, string[]> = {};
  for (const filter of category ? (SPEC_FILTERS[category] ?? []) : []) {
    const values = asArray(raw[filter.param])
      .flatMap((v) => v.split(","))
      .map((v) => v.trim())
      .filter((v) => v.length > 0 && v.length <= 40);
    if (values.length === 0) continue;
    if (filter.kind === "number" && !Number.isFinite(Number(values[0]))) continue;
    if (filter.kind === "select" && filter.options && !values.every((v) => filter.options!.map(String).includes(v))) continue;
    if (filter.kind === "boolean" && values[0] !== "true") continue;
    specFilters[filter.param] = values;
  }
  return { ...base, specFilters };
}

/** Combine active spec filters into the RPC's three spec arguments. */
export function buildSpecQuery(category: CategorySlug | null, specFilters: Record<string, string[]>): Required<SpecQuery> {
  const out: Required<SpecQuery> = { specs: {}, any: {}, ranges: {} };
  for (const filter of category ? (SPEC_FILTERS[category] ?? []) : []) {
    const values = specFilters[filter.param];
    if (!values?.length) continue;
    const q = filter.toQuery(values);
    Object.assign(out.specs, q.specs);
    Object.assign(out.any, q.any);
    for (const [k, v] of Object.entries(q.ranges ?? {})) out.ranges[k] = { ...out.ranges[k], ...v };
  }
  return out;
}

/** Build a catalog URL from a category and suggestion-style filters. */
export function catalogHref(
  category: CategorySlug,
  filters: Record<string, string | number | boolean | Array<string | number>> = {},
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    params.set(key, Array.isArray(value) ? value.join(",") : String(value));
  }
  const qs = params.toString();
  return `/catalog/${category}${qs ? `?${qs}` : ""}`;
}
