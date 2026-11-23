/** Graphics cards, storage and power supplies. */
import { product } from "../types";

export const gpus = [
  product({
    slug: "intel-arc-b580-limited-edition", category: "gpu", brand: "intel", name: "Intel Arc B580 Limited Edition 12 GB", model: "31P06HB0BA",
    description: "12 GB budget card with good 1440p value and strong media encoders for streaming.",
    specs: { chipset: "Arc B580", chipsetMaker: "Intel", vramGb: 12, memoryType: "GDDR6", lengthMm: 272, slotWidth: 2, boardPowerW: 190, recommendedPsuW: 600, powerConnectors: [{ type: "8-pin", count: 1 }], pcieInterface: "PCIe 4.0 x8", outputs: ["3x DisplayPort 2.1", "1x HDMI 2.1a"] },
    powerDrawW: 170, performanceScore: 40, releaseDate: "2024-12-13", referencePriceEur: 279,
  }),
  product({
    slug: "msi-geforce-rtx-5060-ventus-2x-oc", category: "gpu", brand: "msi", name: "MSI GeForce RTX 5060 Ventus 2X OC 8 GB", model: "V532-002R",
    description: "Compact entry-level Blackwell card for 1080p gaming with DLSS 4.",
    specs: { chipset: "GeForce RTX 5060", chipsetMaker: "NVIDIA", vramGb: 8, memoryType: "GDDR7", lengthMm: 197, slotWidth: 2, boardPowerW: 145, recommendedPsuW: 550, powerConnectors: [{ type: "8-pin", count: 1 }], pcieInterface: "PCIe 5.0 x8", outputs: ["3x DisplayPort 2.1b", "1x HDMI 2.1b"] },
    powerDrawW: 140, performanceScore: 42, releaseDate: "2025-05-19", referencePriceEur: 309,
  }),
  product({
    slug: "asus-dual-geforce-rtx-5060-ti-16gb-oc", category: "gpu", brand: "asus", name: "ASUS Dual GeForce RTX 5060 Ti OC 16 GB", model: "DUAL-RTX5060TI-O16G",
    description: "16 GB of VRAM in a two-fan card. Comfortable at 1080p and capable at 1440p.",
    specs: { chipset: "GeForce RTX 5060 Ti", chipsetMaker: "NVIDIA", vramGb: 16, memoryType: "GDDR7", lengthMm: 229, slotWidth: 2.5, boardPowerW: 180, recommendedPsuW: 650, powerConnectors: [{ type: "8-pin", count: 1 }], pcieInterface: "PCIe 5.0 x8", outputs: ["3x DisplayPort 2.1b", "1x HDMI 2.1b"] },
    powerDrawW: 175, performanceScore: 50, releaseDate: "2025-04-16", referencePriceEur: 449,
  }),
  product({
    slug: "sapphire-pulse-radeon-rx-9060-xt-16gb", category: "gpu", brand: "sapphire", name: "Sapphire Pulse Radeon RX 9060 XT 16 GB", model: "11349-03-20G",
    description: "AMD's 16 GB mid-range card. Efficient, quiet and good value at 1440p.",
    specs: { chipset: "Radeon RX 9060 XT", chipsetMaker: "AMD", vramGb: 16, memoryType: "GDDR6", lengthMm: 240, slotWidth: 2, boardPowerW: 160, recommendedPsuW: 550, powerConnectors: [{ type: "8-pin", count: 1 }], pcieInterface: "PCIe 5.0 x16", outputs: ["2x DisplayPort 2.1a", "1x HDMI 2.1b"] },
    powerDrawW: 160, performanceScore: 50, releaseDate: "2025-06-05", referencePriceEur: 389,
  }),
  product({
    slug: "asus-prime-geforce-rtx-5070-oc", category: "gpu", brand: "asus", name: "ASUS Prime GeForce RTX 5070 OC 12 GB", model: "PRIME-RTX5070-O12G",
    description: "SFF-ready RTX 5070 with a 2.5-slot cooler. A strong 1440p high-refresh card.",
    specs: { chipset: "GeForce RTX 5070", chipsetMaker: "NVIDIA", vramGb: 12, memoryType: "GDDR7", lengthMm: 304, slotWidth: 2.5, boardPowerW: 250, recommendedPsuW: 750, powerConnectors: [{ type: "12V-2x6", count: 1 }], pcieInterface: "PCIe 5.0 x16", outputs: ["3x DisplayPort 2.1b", "1x HDMI 2.1b"] },
    powerDrawW: 240, performanceScore: 64, releaseDate: "2025-03-05", referencePriceEur: 599,
  }),
  product({
    slug: "powercolor-reaper-radeon-rx-9070", category: "gpu", brand: "powercolor", name: "PowerColor Reaper Radeon RX 9070 16 GB", model: "RX9070 16G-A",
    description: "Compact two-slot RX 9070 with 16 GB. Excellent 1440p efficiency.",
    specs: { chipset: "Radeon RX 9070", chipsetMaker: "AMD", vramGb: 16, memoryType: "GDDR6", lengthMm: 304, slotWidth: 2, boardPowerW: 220, recommendedPsuW: 650, powerConnectors: [{ type: "8-pin", count: 2 }], pcieInterface: "PCIe 5.0 x16", outputs: ["3x DisplayPort 2.1a", "1x HDMI 2.1b"] },
    powerDrawW: 220, performanceScore: 68, releaseDate: "2025-03-06", referencePriceEur: 599,
  }),
  product({
    slug: "sapphire-pulse-radeon-rx-9070-xt", category: "gpu", brand: "sapphire", name: "Sapphire Pulse Radeon RX 9070 XT 16 GB", model: "11348-03-20G",
    description: "AMD's high-end RDNA 4 card. Trades blows with the RTX 5070 Ti at a lower price.",
    specs: { chipset: "Radeon RX 9070 XT", chipsetMaker: "AMD", vramGb: 16, memoryType: "GDDR6", lengthMm: 320, slotWidth: 2.8, boardPowerW: 304, recommendedPsuW: 750, powerConnectors: [{ type: "8-pin", count: 2 }], pcieInterface: "PCIe 5.0 x16", outputs: ["2x DisplayPort 2.1a", "2x HDMI 2.1b"] },
    powerDrawW: 300, performanceScore: 76, releaseDate: "2025-03-06", referencePriceEur: 689,
  }),
  product({
    slug: "gigabyte-geforce-rtx-5070-ti-windforce-oc-sff", category: "gpu", brand: "gigabyte", name: "Gigabyte GeForce RTX 5070 Ti Windforce OC SFF 16 GB", model: "GV-N507TWF3OC-16GD",
    description: "16 GB RTX 5070 Ti in a small-form-factor-friendly shroud. Great at 1440p and capable at 4K.",
    specs: { chipset: "GeForce RTX 5070 Ti", chipsetMaker: "NVIDIA", vramGb: 16, memoryType: "GDDR7", lengthMm: 304, slotWidth: 2.5, boardPowerW: 300, recommendedPsuW: 750, powerConnectors: [{ type: "12V-2x6", count: 1 }], pcieInterface: "PCIe 5.0 x16", outputs: ["3x DisplayPort 2.1b", "1x HDMI 2.1b"] },
    powerDrawW: 290, performanceScore: 80, releaseDate: "2025-02-20", referencePriceEur: 849,
  }),
  product({
    slug: "msi-geforce-rtx-5080-ventus-3x-oc", category: "gpu", brand: "msi", name: "MSI GeForce RTX 5080 Ventus 3X OC 16 GB", model: "V531-005R",
    description: "Triple-fan RTX 5080 for high-refresh 4K with DLSS and frame generation.",
    specs: { chipset: "GeForce RTX 5080", chipsetMaker: "NVIDIA", vramGb: 16, memoryType: "GDDR7", lengthMm: 338, slotWidth: 3, boardPowerW: 360, recommendedPsuW: 850, powerConnectors: [{ type: "12V-2x6", count: 1 }], pcieInterface: "PCIe 5.0 x16", outputs: ["3x DisplayPort 2.1b", "1x HDMI 2.1b"] },
    powerDrawW: 340, performanceScore: 88, releaseDate: "2025-01-30", referencePriceEur: 1149,
  }),
  product({
    slug: "asus-tuf-gaming-geforce-rtx-5090-oc", category: "gpu", brand: "asus", name: "ASUS TUF Gaming GeForce RTX 5090 OC 32 GB", model: "TUF-RTX5090-O32G-GAMING",
    description: "The flagship. 32 GB of GDDR7 for 4K gaming, AI workloads and 3D rendering. Needs a big case and PSU.",
    specs: { chipset: "GeForce RTX 5090", chipsetMaker: "NVIDIA", vramGb: 32, memoryType: "GDDR7", lengthMm: 348, slotWidth: 3.6, boardPowerW: 600, recommendedPsuW: 1000, powerConnectors: [{ type: "12V-2x6", count: 1 }], pcieInterface: "PCIe 5.0 x16", outputs: ["3x DisplayPort 2.1b", "2x HDMI 2.1b"] },
    powerDrawW: 560, performanceScore: 100, releaseDate: "2025-01-30", referencePriceEur: 2799,
  }),
];

export const storage = [
  product({
    slug: "samsung-990-pro-2tb", category: "storage", brand: "samsung", name: "Samsung 990 PRO 2 TB", model: "MZ-V9P2T0BW",
    description: "Top-tier PCIe 4.0 NVMe SSD with excellent sustained performance.",
    specs: { type: "SSD", formFactor: "M.2", m2Size: "2280", interface: "PCIe 4.0 x4", capacityGb: 2000, readMbs: 7450, writeMbs: 6900, hasDram: true, tbw: 1200 },
    powerDrawW: 6, performanceScore: 88, releaseDate: "2022-10-18", referencePriceEur: 159,
    variants: [
      { key: "1tb", label: "1 TB", mpn: "MZ-V9P1T0BW", specsOverride: { capacityGb: 1000, writeMbs: 6900, tbw: 600 }, priceFactor: 0.6 },
      { key: "2tb", label: "2 TB", mpn: "MZ-V9P2T0BW" },
      { key: "4tb", label: "4 TB", mpn: "MZ-V9P4T0BW", specsOverride: { capacityGb: 4000, writeMbs: 6900, tbw: 2400 }, priceFactor: 1.95 },
    ],
  }),
  product({
    slug: "samsung-9100-pro-2tb", category: "storage", brand: "samsung", name: "Samsung 9100 PRO 2 TB", model: "MZ-VAP2T0BW",
    description: "PCIe 5.0 NVMe SSD for the fastest load times. Needs a Gen5 M.2 slot to reach full speed.",
    specs: { type: "SSD", formFactor: "M.2", m2Size: "2280", interface: "PCIe 5.0 x4", capacityGb: 2000, readMbs: 14700, writeMbs: 13400, hasDram: true, tbw: 1200 },
    powerDrawW: 8, performanceScore: 98, releaseDate: "2025-03-18", referencePriceEur: 249,
  }),
  product({
    slug: "wd-black-sn850x-1tb", category: "storage", brand: "western-digital", name: "WD_BLACK SN850X 1 TB", model: "WDS100T2X0E",
    description: "Fast PCIe 4.0 gaming SSD with consistent performance.",
    specs: { type: "SSD", formFactor: "M.2", m2Size: "2280", interface: "PCIe 4.0 x4", capacityGb: 1000, readMbs: 7300, writeMbs: 6300, hasDram: true, tbw: 600 },
    powerDrawW: 6, performanceScore: 82, releaseDate: "2022-08-02", referencePriceEur: 85,
  }),
  product({
    slug: "crucial-p3-plus-1tb", category: "storage", brand: "crucial", name: "Crucial P3 Plus 1 TB", model: "CT1000P3PSSD8",
    description: "Budget PCIe 4.0 SSD without DRAM. Fine for games and a boot drive.",
    specs: { type: "SSD", formFactor: "M.2", m2Size: "2280", interface: "PCIe 4.0 x4", capacityGb: 1000, readMbs: 5000, writeMbs: 3600, hasDram: false, tbw: 220 },
    powerDrawW: 5, performanceScore: 55, releaseDate: "2022-05-01", referencePriceEur: 62,
  }),
  product({
    slug: "kingston-nv3-1tb", category: "storage", brand: "kingston", name: "Kingston NV3 1 TB", model: "SNV3S/1000G",
    description: "Low-cost NVMe drive for budget builds.",
    specs: { type: "SSD", formFactor: "M.2", m2Size: "2280", interface: "PCIe 4.0 x4", capacityGb: 1000, readMbs: 6000, writeMbs: 4000, hasDram: false, tbw: 320 },
    powerDrawW: 5, performanceScore: 52, releaseDate: "2024-06-01", referencePriceEur: 59,
  }),
  product({
    slug: "crucial-t500-2tb", category: "storage", brand: "crucial", name: "Crucial T500 2 TB", model: "CT2000T500SSD8",
    description: "High-end PCIe 4.0 SSD at a mid-range price.",
    specs: { type: "SSD", formFactor: "M.2", m2Size: "2280", interface: "PCIe 4.0 x4", capacityGb: 2000, readMbs: 7400, writeMbs: 7000, hasDram: true, tbw: 1200 },
    powerDrawW: 6, performanceScore: 85, releaseDate: "2023-11-01", referencePriceEur: 129,
  }),
  product({
    slug: "samsung-870-evo-1tb", category: "storage", brand: "samsung", name: "Samsung 870 EVO 1 TB", model: "MZ-77E1T0B/EU",
    description: '2.5" SATA SSD. A reliable upgrade for older systems or extra fast storage.',
    specs: { type: "SSD", formFactor: '2.5"', interface: "SATA", capacityGb: 1000, readMbs: 560, writeMbs: 530, hasDram: true, tbw: 600 },
    powerDrawW: 3, performanceScore: 30, releaseDate: "2021-01-19", referencePriceEur: 89,
  }),
  product({
    slug: "seagate-barracuda-2tb", category: "storage", brand: "seagate", name: "Seagate BarraCuda 2 TB", model: "ST2000DM008",
    description: '3.5" 7200 rpm hard drive for bulk storage.',
    specs: { type: "HDD", formFactor: '3.5"', interface: "SATA", capacityGb: 2000, readMbs: 220, writeMbs: 220, rpm: 7200 },
    powerDrawW: 6, performanceScore: 10, releaseDate: "2018-01-01", referencePriceEur: 65,
  }),
  product({
    slug: "wd-blue-4tb", category: "storage", brand: "western-digital", name: "WD Blue 4 TB", model: "WD40EZAX",
    description: '3.5" 5400 rpm hard drive for media libraries and backups.',
    specs: { type: "HDD", formFactor: '3.5"', interface: "SATA", capacityGb: 4000, readMbs: 180, writeMbs: 180, rpm: 5400 },
    powerDrawW: 5, performanceScore: 8, releaseDate: "2021-01-01", referencePriceEur: 89,
  }),
];

export const psus = [
  product({
    slug: "msi-mag-a650bn", category: "psu", brand: "msi", name: "MSI MAG A650BN 650 W", model: "306-7ZP2B22-CE0",
    description: "Budget 80+ Bronze, non-modular unit. Fine for entry-level builds without high-end GPUs.",
    specs: { wattage: 650, efficiency: "80+ Bronze", modular: "No", formFactor: "ATX", atxVersion: "2.x", lengthMm: 140, connectors: { eps8pin: 1, pcie8pin: 2, "12v2x6": 0, sata: 5 } },
    powerDrawW: 0, performanceScore: 30, releaseDate: "2021-03-01", referencePriceEur: 55,
  }),
  product({
    slug: "be-quiet-pure-power-12-m-750w", category: "psu", brand: "be-quiet", name: "be quiet! Pure Power 12 M 750 W", model: "BN343",
    description: "Quiet, fully modular 80+ Gold ATX 3.0 unit with a native 12V-2x6 connector.",
    specs: { wattage: 750, efficiency: "80+ Gold", modular: "Full", formFactor: "ATX", atxVersion: "3.0", lengthMm: 160, connectors: { eps8pin: 2, pcie8pin: 2, "12v2x6": 1, sata: 6 } },
    powerDrawW: 0, performanceScore: 65, releaseDate: "2023-01-01", referencePriceEur: 99,
  }),
  product({
    slug: "corsair-rm750e-2025", category: "psu", brand: "corsair", name: "Corsair RM750e (2025) 750 W", model: "CP-9020294-EU",
    description: "Fully modular 80+ Gold ATX 3.1 power supply with a native 12V-2x6 cable.",
    specs: { wattage: 750, efficiency: "80+ Gold", modular: "Full", formFactor: "ATX", atxVersion: "3.1", lengthMm: 140, connectors: { eps8pin: 2, pcie8pin: 3, "12v2x6": 1, sata: 7 } },
    powerDrawW: 0, performanceScore: 68, releaseDate: "2025-01-01", referencePriceEur: 95,
  }),
  product({
    slug: "corsair-rm850x-2024", category: "psu", brand: "corsair", name: "Corsair RM850x (2024) 850 W", model: "CP-9020270-EU",
    description: "Premium, near-silent 80+ Gold ATX 3.1 unit with a ten-year warranty.",
    specs: { wattage: 850, efficiency: "80+ Gold", modular: "Full", formFactor: "ATX", atxVersion: "3.1", lengthMm: 160, connectors: { eps8pin: 2, pcie8pin: 4, "12v2x6": 1, sata: 14 } },
    powerDrawW: 0, performanceScore: 78, releaseDate: "2024-03-01", referencePriceEur: 139,
  }),
  product({
    slug: "cooler-master-mwe-gold-850-v2", category: "psu", brand: "cooler-master", name: "Cooler Master MWE Gold 850 V2 ATX 3.0", model: "MPE-8501-AFAAG-3EU",
    description: "Value 850 W fully modular Gold unit with a 12V-2x6 cable.",
    specs: { wattage: 850, efficiency: "80+ Gold", modular: "Full", formFactor: "ATX", atxVersion: "3.0", lengthMm: 160, connectors: { eps8pin: 2, pcie8pin: 3, "12v2x6": 1, sata: 12 } },
    powerDrawW: 0, performanceScore: 66, releaseDate: "2023-05-01", referencePriceEur: 109,
  }),
  product({
    slug: "seasonic-focus-gx-1000-atx3", category: "psu", brand: "seasonic", name: "Seasonic Focus GX-1000 ATX 3.0 1000 W", model: "FOCUS-GX-1000-V4",
    description: "1000 W Gold unit for high-end GPUs, with a native 12V-2x6 connector and a twelve-year warranty.",
    specs: { wattage: 1000, efficiency: "80+ Gold", modular: "Full", formFactor: "ATX", atxVersion: "3.0", lengthMm: 140, connectors: { eps8pin: 2, pcie8pin: 4, "12v2x6": 1, sata: 10 } },
    powerDrawW: 0, performanceScore: 85, releaseDate: "2023-06-01", referencePriceEur: 179,
  }),
  product({
    slug: "be-quiet-dark-power-13-1000w", category: "psu", brand: "be-quiet", name: "be quiet! Dark Power 13 1000 W", model: "BN335",
    description: "80+ Titanium flagship PSU for RTX 5090-class builds. Very quiet and very efficient.",
    specs: { wattage: 1000, efficiency: "80+ Titanium", modular: "Full", formFactor: "ATX", atxVersion: "3.0", lengthMm: 175, connectors: { eps8pin: 2, pcie8pin: 4, "12v2x6": 1, sata: 10 } },
    powerDrawW: 0, performanceScore: 95, releaseDate: "2023-02-01", referencePriceEur: 279,
  }),
  product({
    slug: "corsair-sf750-platinum", category: "psu", brand: "corsair", name: "Corsair SF750 Platinum 750 W", model: "CP-9020186-EU",
    description: "Compact SFX unit for small form factor builds.",
    specs: { wattage: 750, efficiency: "80+ Platinum", modular: "Full", formFactor: "SFX", atxVersion: "2.x", lengthMm: 100, connectors: { eps8pin: 2, pcie8pin: 4, "12v2x6": 0, sata: 4 } },
    powerDrawW: 0, performanceScore: 80, releaseDate: "2019-01-01", referencePriceEur: 169,
  }),
];
