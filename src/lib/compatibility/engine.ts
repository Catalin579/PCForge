import { type CategorySlug } from "@/lib/catalog/specs";

import { BuildContext } from "./build-context";
import { estimatePerformance } from "./performance";
import { DEFAULT_HEADROOM_RATIO, estimatePower } from "./power";
import { RULE_DEFINITIONS, type RuleCode } from "./rule-definitions";
import { REQUIRED_CATEGORIES, RULES, toIssue } from "./rules";
import {
  type AnyBuildComponent,
  type BuildStatus,
  type CompatibilityIssue,
  type CompatibilityReport,
  type RuleConfig,
  type Severity,
  type UseCase,
} from "./types";

export type EvaluateOptions = {
  /**
   * Rows from `compatibility_rules`. Missing rules fall back to their
   * defaults; rows for unknown codes are ignored.
   */
  rules?: RuleConfig[];
  /** Drives the performance tier. Defaults to gaming. */
  useCase?: UseCase;
};

const SEVERITY_ORDER: Record<Severity, number> = { error: 0, warning: 1, info: 2 };

type ResolvedRule = {
  code: RuleCode;
  title: string;
  severity: Severity;
  /** True when an admin changed the severity from its default. */
  severityOverridden: boolean;
  isActive: boolean;
  params: Record<string, unknown>;
};

export function resolveRules(configs: RuleConfig[] = []): ResolvedRule[] {
  const byCode = new Map(configs.map((c) => [c.code, c]));
  return RULE_DEFINITIONS.map((def) => {
    const cfg = byCode.get(def.code);
    const severity = cfg?.severity ?? def.severity;
    return {
      code: def.code,
      title: def.name,
      severity,
      severityOverridden: severity !== def.severity,
      isActive: cfg?.isActive ?? true,
      params: { ...def.params, ...(cfg?.params ?? {}) },
    };
  });
}

/**
 * Evaluate a build: run every active rule, estimate power and performance,
 * and summarise the result. Pure and synchronous; callers load components
 * and rule configs from the database and parse specs before calling it.
 */
export function evaluateBuild(
  components: AnyBuildComponent[],
  options: EvaluateOptions = {},
): CompatibilityReport {
  const ctx = new BuildContext(components);
  const rules = resolveRules(options.rules);
  const headroom = rules.find((r) => r.code === "psu.headroom")?.params.headroomRatio;
  const power = estimatePower(
    ctx,
    typeof headroom === "number" ? headroom : DEFAULT_HEADROOM_RATIO,
  );

  const issues: CompatibilityIssue[] = [];
  for (const rule of rules) {
    if (!rule.isActive) continue;
    for (const finding of RULES[rule.code]({ ctx, params: rule.params, power })) {
      // A finding may raise or lower its own severity (e.g. "adapter works"
      // vs "cannot power the card"), unless an admin has pinned the rule's
      // severity, in which case the admin's choice applies to every finding.
      const effective = rule.severityOverridden ? { ...finding, severity: undefined } : finding;
      issues.push(toIssue(rule.code, rule.title, rule.severity, effective));
    }
  }
  issues.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

  const counts: Record<Severity, number> = { error: 0, warning: 0, info: 0 };
  for (const issue of issues) counts[issue.severity] += 1;

  const missingCategories = findMissingCategories(ctx);

  return {
    status: statusFor(ctx, counts, missingCategories),
    issues,
    counts,
    missingCategories,
    power,
    performance: estimatePerformance(ctx, options.useCase),
  };
}

export function findMissingCategories(ctx: BuildContext): CategorySlug[] {
  if (ctx.isEmpty) return [...REQUIRED_CATEGORIES];
  const missing: CategorySlug[] = REQUIRED_CATEGORIES.filter((c) => !ctx.has(c));
  const cpu = ctx.one("cpu");
  if (cpu && !cpu.specs.coolerIncluded && !ctx.has("cpu-cooler")) missing.push("cpu-cooler");
  if (cpu && !cpu.specs.integratedGraphics && !ctx.has("gpu")) missing.push("gpu");
  return missing;
}

function statusFor(
  ctx: BuildContext,
  counts: Record<Severity, number>,
  missing: CategorySlug[],
): BuildStatus {
  if (ctx.isEmpty) return "empty";
  if (counts.error > 0) return "incompatible";
  if (missing.length > 0) return "incomplete";
  if (counts.warning > 0) return "warnings";
  return "compatible";
}
