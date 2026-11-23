import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { BuildEvaluationError } from "@/lib/builds/evaluate";
import { buildItemInputSchema } from "@/lib/builds/schema";
import { buildView } from "@/lib/builds/view";
import { getRegion } from "@/lib/region/server";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  items: z.array(buildItemInputSchema).max(40),
  useCase: z
    .enum(["gaming", "productivity", "streaming", "content_creation", "workstation", "home_office"])
    .optional(),
  includeMarketplace: z.boolean().optional(),
});

/**
 * Evaluate the builder's current parts for the visitor's market.
 * The region and currency come from the server-side preference, not the body.
 */
export async function POST(request: NextRequest) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid build.", issues: parsed.error.issues }, { status: 400 });
  }

  try {
    const region = await getRegion();
    const supabase = await createClient();
    const view = await buildView(supabase, {
      ...parsed.data,
      regionCode: region.region.code,
      currencyCode: region.currency,
    });
    return NextResponse.json(view, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    if (err instanceof BuildEvaluationError && err.code !== "database") {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 422 });
    }
    console.error("Build evaluation failed", err);
    return NextResponse.json({ error: "Could not evaluate the build. Please try again." }, { status: 500 });
  }
}
