import { type BuildContext } from "./build-context";
import { type PerformanceEstimate, type PerformanceTier, type UseCase } from "./types";

/**
 * Relative performance estimates.
 *
 * Each product carries a 0-100 `performance_score` within its category. The
 * estimates below weight those scores per use case. They are indicative
 * indices for comparing builds, not frame rates or benchmark predictions.
 */

/** Score assumed for integrated graphics when no graphics card is selected. */
const INTEGRATED_GPU_SCORE = 5;
/** Neutral score for supporting parts the user has not picked yet. */
const NEUTRAL_SCORE = 50;

const WEIGHTS: Record<UseCase, { cpu: number; gpu: number; memory: number; storage: number }> = {
  gaming: { cpu: 0.3, gpu: 0.7, memory: 0, storage: 0 },
  streaming: { cpu: 0.5, gpu: 0.4, memory: 0.1, storage: 0 },
  content_creation: { cpu: 0.45, gpu: 0.35, memory: 0.1, storage: 0.1 },
  productivity: { cpu: 0.6, gpu: 0.1, memory: 0.15, storage: 0.15 },
  workstation: { cpu: 0.6, gpu: 0.2, memory: 0.2, storage: 0 },
  home_office: { cpu: 0.5, gpu: 0, memory: 0.25, storage: 0.25 },
};

export const USE_CASES = Object.keys(WEIGHTS) as UseCase[];

export function tierForScore(score: number): PerformanceTier {
  if (score < 35) return "entry";
  if (score < 55) return "mainstream";
  if (score < 80) return "high-end";
  return "enthusiast";
}

function average(values: Array<number | null | undefined>): number | null {
  const known = values.filter((v): v is number => typeof v === "number");
  return known.length ? known.reduce((a, b) => a + b, 0) / known.length : null;
}

export function estimatePerformance(
  ctx: BuildContext,
  primaryUseCase: UseCase = "gaming",
): PerformanceEstimate {
  const cpu = ctx.one("cpu");
  const gpu = ctx.one("gpu");

  const cpuScore = cpu?.performanceScore ?? null;
  const gpuScore =
    gpu?.performanceScore ??
    (cpu && !gpu && cpu.specs.integratedGraphics ? INTEGRATED_GPU_SCORE : null);
  const memoryScore = average(ctx.all("memory").map((m) => m.performanceScore)) ?? NEUTRAL_SCORE;
  // The fastest drive is the one the OS and apps live on.
  const storageScores = ctx
    .all("storage")
    .map((s) => s.performanceScore)
    .filter((s): s is number => typeof s === "number");
  const storageScore = storageScores.length ? Math.max(...storageScores) : NEUTRAL_SCORE;

  const scores = {} as Record<UseCase, number | null>;
  for (const useCase of USE_CASES) {
    const w = WEIGHTS[useCase];
    if (cpuScore === null || (w.gpu > 0 && gpuScore === null)) {
      scores[useCase] = null;
      continue;
    }
    const value =
      w.cpu * cpuScore +
      w.gpu * (gpuScore ?? 0) +
      w.memory * memoryScore +
      w.storage * storageScore;
    scores[useCase] = Math.round(Math.min(100, Math.max(0, value)));
  }

  const primary = scores[primaryUseCase];

  return {
    scores,
    tier: primary === null ? null : tierForScore(primary),
    bottleneck: estimateBottleneck(cpuScore, gpu ? gpuScore : null),
  };
}

/**
 * Gaming bottleneck heuristic from the gap between CPU and GPU scores.
 * A fast GPU with a slow CPU leaves frames on the table (CPU-limited); a
 * fast CPU with a slow GPU is normal for budget gaming but worth flagging
 * when the gap is extreme, because money could be moved to the GPU.
 */
export function estimateBottleneck(
  cpuScore: number | null,
  gpuScore: number | null,
): PerformanceEstimate["bottleneck"] {
  if (cpuScore === null || gpuScore === null) return { limitedBy: null, risk: null, message: null };

  const gap = gpuScore - cpuScore;
  if (gap > 40) {
    return {
      limitedBy: "cpu",
      risk: "high",
      message:
        "The CPU will hold this graphics card back in many games. A faster CPU would unlock much more of the GPU.",
    };
  }
  if (gap > 25) {
    return {
      limitedBy: "cpu",
      risk: "medium",
      message: "The CPU may limit frame rates in CPU-heavy games, especially at 1080p.",
    };
  }
  if (gap < -55) {
    return {
      limitedBy: "gpu",
      risk: "high",
      message:
        "The graphics card is far weaker than the CPU. For gaming, moving budget from the CPU to the GPU gives more performance.",
    };
  }
  if (gap < -35) {
    return {
      limitedBy: "gpu",
      risk: "medium",
      message:
        "The graphics card will set the limit in games. That is fine for 1080p, but the CPU has room for a stronger GPU.",
    };
  }
  return { limitedBy: null, risk: "low", message: null };
}
