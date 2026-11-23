import { z } from "zod";

/** Input accepted from clients when evaluating or saving a build. */
export const buildItemInputSchema = z.object({
  variantId: z.uuid(),
  quantity: z.number().int().min(1).max(16),
  selectedOfferId: z.uuid().nullish(),
});

export const evaluateBuildInputSchema = z.object({
  regionCode: z.string().regex(/^[A-Z]{2}$/),
  currencyCode: z
    .string()
    .regex(/^[A-Z]{3}$/)
    .optional(),
  useCase: z
    .enum(["gaming", "productivity", "streaming", "content_creation", "workstation", "home_office"])
    .optional(),
  includeMarketplace: z.boolean().optional(),
  items: z.array(buildItemInputSchema).max(40),
});

export type EvaluateBuildInput = z.infer<typeof evaluateBuildInputSchema>;
