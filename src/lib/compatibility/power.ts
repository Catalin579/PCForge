import { type CategorySlug } from "@/lib/catalog/specs";

import { type BuildContext } from "./build-context";
import { type PowerEstimate } from "./types";

/** Common retail PSU sizes, used to round recommendations up. */
export const PSU_SIZES_W = [450, 550, 650, 750, 850, 1000, 1200, 1300, 1600] as const;

/** Fans, USB devices, RGB and other small loads not modelled per part. */
export const MISC_LOAD_W = 25;

export const DEFAULT_HEADROOM_RATIO = 0.3;

export function roundUpToPsuSize(watts: number): number {
  return PSU_SIZES_W.find((s) => s >= watts) ?? Math.ceil(watts / 100) * 100;
}

type Line = {
  category: CategorySlug;
  componentId: string;
  name: string;
  typical: number;
  peak: number;
};

/**
 * Estimate power draw for the internal components of a build.
 *
 * - typical: `products.power_draw_w` when known, otherwise a spec-based guess.
 * - peak: CPU at full package power (PPT/PL2) and GPU at total board power.
 *   ATX 3.x PSUs absorb millisecond GPU spikes, so these are sustained peaks.
 * Peripherals (monitors, keyboards...) are powered separately and ignored.
 */
export function estimatePower(
  ctx: BuildContext,
  headroomRatio = DEFAULT_HEADROOM_RATIO,
): PowerEstimate {
  const lines: Line[] = [];
  const push = (
    category: CategorySlug,
    componentId: string,
    name: string,
    typical: number,
    peak: number,
  ) =>
    lines.push({
      category,
      componentId,
      name,
      typical: Math.round(typical),
      peak: Math.round(peak),
    });

  for (const c of ctx.all("cpu")) {
    push(
      "cpu",
      c.id,
      c.name,
      (c.powerDrawW ?? c.specs.tdpW) * c.quantity,
      c.specs.maxPowerW * c.quantity,
    );
  }
  for (const c of ctx.all("gpu")) {
    const typical = c.powerDrawW ?? c.specs.boardPowerW * 0.9;
    push("gpu", c.id, c.name, typical * c.quantity, c.specs.boardPowerW * c.quantity);
  }
  for (const c of ctx.all("motherboard")) {
    const w = c.powerDrawW ?? 30;
    push("motherboard", c.id, c.name, w, w);
  }
  for (const c of ctx.all("memory")) {
    const w = (c.powerDrawW ?? c.specs.modules * 4) * c.quantity;
    push("memory", c.id, c.name, w, w);
  }
  for (const c of ctx.all("storage")) {
    const w = (c.powerDrawW ?? (c.specs.type === "HDD" ? 8 : 5)) * c.quantity;
    push("storage", c.id, c.name, w, w);
  }
  for (const c of ctx.all("cpu-cooler")) {
    const w = c.powerDrawW ?? (c.specs.type === "aio" ? 8 : 3);
    push("cpu-cooler", c.id, c.name, w, w);
  }
  for (const c of ctx.all("case-fan")) {
    const w = (c.powerDrawW ?? c.specs.packSize * 2) * c.quantity;
    push("case-fan", c.id, c.name, w, w);
  }

  const hasParts = lines.length > 0;
  const typicalLoadW = lines.reduce((n, l) => n + l.typical, 0) + (hasParts ? MISC_LOAD_W : 0);
  const peakW = lines.reduce((n, l) => n + l.peak, 0) + (hasParts ? MISC_LOAD_W : 0);

  const gpuRecommendation = Math.max(0, ...ctx.all("gpu").map((g) => g.specs.recommendedPsuW));
  const recommendedPsuW = hasParts
    ? roundUpToPsuSize(Math.max(gpuRecommendation, peakW * (1 + headroomRatio)))
    : 0;

  const psu = ctx.one("psu");
  const psuW = psu ? psu.specs.wattage : null;

  return {
    typicalLoadW,
    peakW,
    recommendedPsuW,
    psuW,
    loadRatio: psuW ? Math.round((peakW / psuW) * 100) / 100 : null,
    breakdown: lines.map((l) => ({
      category: l.category,
      componentId: l.componentId,
      name: l.name,
      watts: l.peak,
    })),
  };
}
