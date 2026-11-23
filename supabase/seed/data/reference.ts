/**
 * Reference seed data: markets, currencies, taxes, categories, brands,
 * retailers and compatibility rules.
 *
 * Exchange rates and tax rates are realistic as of late 2025 but are seed
 * data, not a live feed. Retailer links are search links, so they always
 * resolve, rather than guessed product URLs.
 */

export const currencies = [
  { code: "EUR", name: "Euro", symbol: "€", minorUnits: 2 },
  { code: "RON", name: "Romanian leu", symbol: "lei", minorUnits: 2 },
  { code: "USD", name: "US dollar", symbol: "$", minorUnits: 2 },
] as const;

/** Rates are stored with EUR as base; the pricing service derives inverses and crosses. */
export const exchangeRates = [
  {
    base: "EUR",
    quote: "RON",
    rate: 5.09,
    validAt: "2026-11-20T00:00:00Z",
    source: "seed (ECB reference, approx.)",
  },
  {
    base: "EUR",
    quote: "USD",
    rate: 1.16,
    validAt: "2026-11-20T00:00:00Z",
    source: "seed (ECB reference, approx.)",
  },
] as const;

export const regions = [
  {
    code: "RO",
    name: "Romania",
    defaultCurrency: "RON",
    defaultLocale: "ro-RO",
    supportedLocales: ["ro-RO", "en-GB"],
    extraCurrencies: ["EUR"],
    sortOrder: 1,
  },
  {
    code: "DE",
    name: "Germany",
    defaultCurrency: "EUR",
    defaultLocale: "de-DE",
    supportedLocales: ["de-DE", "en-GB"],
    extraCurrencies: [],
    sortOrder: 2,
  },
] as const;

export const taxRules = [
  {
    region: "RO",
    name: "TVA standard",
    rate: 0.19,
    validFrom: "2017-01-01",
    validTo: "2025-08-01",
  },
  { region: "RO", name: "TVA standard", rate: 0.21, validFrom: "2025-08-01", validTo: null },
  { region: "DE", name: "Mehrwertsteuer", rate: 0.19, validFrom: "2021-01-01", validTo: null },
] as const;

export const categories = [
  {
    slug: "cpu",
    name: "CPU",
    plural: "CPUs",
    icon: "Cpu",
    isCore: true,
    max: 1,
    description: "The processor that runs everything else.",
  },
  {
    slug: "motherboard",
    name: "Motherboard",
    plural: "Motherboards",
    icon: "CircuitBoard",
    isCore: true,
    max: 1,
    description: "Connects every component; decides socket, memory type and expansion.",
  },
  {
    slug: "memory",
    name: "Memory",
    plural: "Memory kits",
    icon: "MemoryStick",
    isCore: true,
    max: 4,
    description: "System RAM. Match the type (DDR4/DDR5) to your motherboard.",
  },
  {
    slug: "gpu",
    name: "Graphics card",
    plural: "Graphics cards",
    icon: "Gpu",
    isCore: true,
    max: 1,
    description: "Renders games and accelerates creative work.",
  },
  {
    slug: "storage",
    name: "Storage",
    plural: "Storage drives",
    icon: "HardDrive",
    isCore: true,
    max: 8,
    description: "SSDs and hard drives for the OS, games and files.",
  },
  {
    slug: "psu",
    name: "Power supply",
    plural: "Power supplies",
    icon: "PlugZap",
    isCore: true,
    max: 1,
    description: "Powers the system. Size it for peak draw plus headroom.",
  },
  {
    slug: "case",
    name: "Case",
    plural: "Cases",
    icon: "Box",
    isCore: true,
    max: 1,
    description: "Houses the build; limits board size, GPU length and cooler height.",
  },
  {
    slug: "cpu-cooler",
    name: "CPU cooler",
    plural: "CPU coolers",
    icon: "Fan",
    isCore: true,
    max: 1,
    description: "Air or liquid cooling for the processor.",
  },
  {
    slug: "case-fan",
    name: "Case fan",
    plural: "Case fans",
    icon: "Wind",
    isCore: false,
    max: 12,
    description: "Extra airflow for the case.",
  },
  {
    slug: "monitor",
    name: "Monitor",
    plural: "Monitors",
    icon: "Monitor",
    isCore: false,
    max: 4,
    description: "Displays.",
  },
  {
    slug: "keyboard",
    name: "Keyboard",
    plural: "Keyboards",
    icon: "Keyboard",
    isCore: false,
    max: 1,
    description: "Keyboards.",
  },
  {
    slug: "mouse",
    name: "Mouse",
    plural: "Mice",
    icon: "Mouse",
    isCore: false,
    max: 1,
    description: "Mice.",
  },
  {
    slug: "headset",
    name: "Headset",
    plural: "Headsets",
    icon: "Headphones",
    isCore: false,
    max: 1,
    description: "Headsets and headphones.",
  },
] as const;

export const brands = [
  ["amd", "AMD", "https://www.amd.com"],
  ["intel", "Intel", "https://www.intel.com"],
  ["nvidia", "NVIDIA", "https://www.nvidia.com"],
  ["asus", "ASUS", "https://www.asus.com"],
  ["msi", "MSI", "https://www.msi.com"],
  ["gigabyte", "Gigabyte", "https://www.gigabyte.com"],
  ["asrock", "ASRock", "https://www.asrock.com"],
  ["sapphire", "Sapphire", "https://www.sapphiretech.com"],
  ["powercolor", "PowerColor", "https://www.powercolor.com"],
  ["kingston", "Kingston", "https://www.kingston.com"],
  ["corsair", "Corsair", "https://www.corsair.com"],
  ["gskill", "G.Skill", "https://www.gskill.com"],
  ["crucial", "Crucial", "https://www.crucial.com"],
  ["samsung", "Samsung", "https://www.samsung.com"],
  ["western-digital", "Western Digital", "https://www.westerndigital.com"],
  ["seagate", "Seagate", "https://www.seagate.com"],
  ["seasonic", "Seasonic", "https://seasonic.com"],
  ["be-quiet", "be quiet!", "https://www.bequiet.com"],
  ["cooler-master", "Cooler Master", "https://www.coolermaster.com"],
  ["fractal-design", "Fractal Design", "https://www.fractal-design.com"],
  ["lian-li", "Lian Li", "https://lian-li.com"],
  ["nzxt", "NZXT", "https://nzxt.com"],
  ["noctua", "Noctua", "https://noctua.at"],
  ["thermalright", "Thermalright", "https://www.thermalright.com"],
  ["deepcool", "DeepCool", "https://www.deepcool.com"],
  ["arctic", "Arctic", "https://www.arctic.de"],
  ["dell", "Dell", "https://www.dell.com"],
  ["lg", "LG", "https://www.lg.com"],
  ["logitech", "Logitech", "https://www.logitechg.com"],
  ["razer", "Razer", "https://www.razer.com"],
  ["steelseries", "SteelSeries", "https://steelseries.com"],
  ["hyperx", "HyperX", "https://hyperx.com"],
] as const;

export type BrandSlug = (typeof brands)[number][0];

export const retailers = [
  {
    slug: "emag",
    name: "eMAG",
    websiteUrl: "https://www.emag.ro",
    searchUrlTemplate: "https://www.emag.ro/search/{query}",
    isMarketplace: false,
    regions: [{ region: "RO", currency: "RON", shipping: 0, freeOver: 250, days: [1, 3] }],
    /** Share of this retailer's offers that are third-party marketplace listings. */
    marketplaceShare: 0.25,
    priceBias: 1.0,
  },
  {
    slug: "pc-garage",
    name: "PC Garage",
    websiteUrl: "https://www.pcgarage.ro",
    searchUrlTemplate: "https://www.pcgarage.ro/cauta/{query}",
    isMarketplace: false,
    regions: [{ region: "RO", currency: "RON", shipping: 25, freeOver: 500, days: [1, 2] }],
    marketplaceShare: 0,
    priceBias: 0.99,
  },
  {
    slug: "altex",
    name: "Altex",
    websiteUrl: "https://altex.ro",
    searchUrlTemplate: "https://altex.ro/cauta/?q={query}",
    isMarketplace: false,
    regions: [{ region: "RO", currency: "RON", shipping: 20, freeOver: 300, days: [2, 4] }],
    marketplaceShare: 0,
    priceBias: 1.03,
  },
  {
    slug: "evomag",
    name: "evoMAG",
    websiteUrl: "https://www.evomag.ro",
    searchUrlTemplate: null,
    isMarketplace: false,
    regions: [{ region: "RO", currency: "RON", shipping: 22, freeOver: 400, days: [1, 3] }],
    marketplaceShare: 0,
    priceBias: 0.98,
  },
  {
    slug: "mindfactory",
    name: "Mindfactory",
    websiteUrl: "https://www.mindfactory.de",
    searchUrlTemplate: "https://www.mindfactory.de/search_result.php?search_query={query}",
    isMarketplace: false,
    regions: [{ region: "DE", currency: "EUR", shipping: 6.99, freeOver: null, days: [1, 3] }],
    marketplaceShare: 0,
    priceBias: 0.97,
  },
  {
    slug: "alternate",
    name: "Alternate",
    websiteUrl: "https://www.alternate.de",
    searchUrlTemplate: "https://www.alternate.de/listing.xhtml?q={query}",
    isMarketplace: false,
    regions: [{ region: "DE", currency: "EUR", shipping: 5.99, freeOver: 150, days: [1, 2] }],
    marketplaceShare: 0,
    priceBias: 1.01,
  },
  {
    slug: "caseking",
    name: "Caseking",
    websiteUrl: "https://www.caseking.de",
    searchUrlTemplate: "https://www.caseking.de/search?search={query}",
    isMarketplace: false,
    regions: [{ region: "DE", currency: "EUR", shipping: 5.99, freeOver: 200, days: [1, 3] }],
    marketplaceShare: 0,
    priceBias: 1.02,
  },
  {
    slug: "amazon-de",
    name: "Amazon.de",
    websiteUrl: "https://www.amazon.de",
    searchUrlTemplate: "https://www.amazon.de/s?k={query}",
    isMarketplace: true,
    regions: [{ region: "DE", currency: "EUR", shipping: 0, freeOver: null, days: [1, 2] }],
    marketplaceShare: 0.4,
    priceBias: 1.0,
  },
] as const;

/** Compatibility rules: defined next to the engine that implements them. */
export { RULE_DEFINITIONS as compatibilityRules } from "../../../src/lib/compatibility/rule-definitions";
