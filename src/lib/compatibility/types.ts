import { type CategorySlug, type SpecsFor } from "@/lib/catalog/specs";

import { type RuleCode } from "./rule-definitions";

export type Severity = "error" | "warning" | "info";

/** A component in a build, with specs already parsed for its category. */
export type BuildComponent<C extends CategorySlug = CategorySlug> = {
  /** Variant id (what the build item points at). */
  id: string;
  productId?: string;
  name: string;
  category: C;
  specs: SpecsFor<C>;
  quantity: number;
  /** Typical load draw in watts from `products.power_draw_w`. */
  powerDrawW?: number | null;
  /** 0-100 within the category from `products.performance_score`. */
  performanceScore?: number | null;
};

/** Any component; narrow with `isCategory`. */
export type AnyBuildComponent = { [C in CategorySlug]: BuildComponent<C> }[CategorySlug];

/** Database-tunable rule settings (a `compatibility_rules` row). */
export type RuleConfig = {
  code: string;
  severity: Severity;
  isActive: boolean;
  params: Record<string, unknown>;
};

/**
 * A pointer the UI can turn into a filtered catalog link, e.g. "show
 * motherboards with socket AM5".
 */
export type Suggestion = {
  message: string;
  category?: CategorySlug;
  /** Spec filters, using spec keys from src/lib/catalog/specs.ts. */
  filters?: Record<string, string | number | boolean | Array<string | number>>;
};

export type CompatibilityIssue = {
  rule: RuleCode;
  severity: Severity;
  title: string;
  message: string;
  /** Variant ids of the components involved. */
  componentIds: string[];
  categories: CategorySlug[];
  suggestion?: Suggestion;
};

export type BuildStatus = "empty" | "incomplete" | "compatible" | "warnings" | "incompatible";

export type PowerEstimate = {
  /** Sum of typical load draw of internal components. */
  typicalLoadW: number;
  /** Worst-case sustained draw: CPU at full package power, GPU at board power. */
  peakW: number;
  /** Smallest sensible PSU, rounded up to a common size. */
  recommendedPsuW: number;
  /** Selected PSU wattage, if any. */
  psuW: number | null;
  /** peakW / psuW, when a PSU is selected. */
  loadRatio: number | null;
  breakdown: Array<{ category: CategorySlug; componentId: string; name: string; watts: number }>;
};

export type PerformanceTier = "entry" | "mainstream" | "high-end" | "enthusiast";

export type UseCase =
  "gaming" | "productivity" | "streaming" | "content_creation" | "workstation" | "home_office";

export type PerformanceEstimate = {
  /** 0-100 per use case; null when the parts that drive it are missing. */
  scores: Record<UseCase, number | null>;
  tier: PerformanceTier | null;
  bottleneck: {
    /** Which side limits gaming performance, if the gap is large enough to matter. */
    limitedBy: "cpu" | "gpu" | null;
    /** 0 = balanced, 1 = extreme mismatch. */
    risk: "low" | "medium" | "high" | null;
    message: string | null;
  };
};

export type CompatibilityReport = {
  status: BuildStatus;
  issues: CompatibilityIssue[];
  counts: Record<Severity, number>;
  missingCategories: CategorySlug[];
  power: PowerEstimate;
  performance: PerformanceEstimate;
};
