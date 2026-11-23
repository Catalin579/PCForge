"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

import { CURRENCY_COOKIE, REGION_COOKIE, REGION_COOKIE_MAX_AGE } from "./constants";
import { getActiveRegions } from "./server";

const schema = z.object({
  region: z.string().regex(/^[A-Z]{2}$/),
  currency: z
    .string()
    .regex(/^[A-Z]{3}$/)
    .optional(),
});

export type SetRegionResult = { ok: true } | { ok: false; error: string };

/** Save the user's market choice in cookies (and their profile when signed in). */
export async function setRegion(input: {
  region: string;
  currency?: string;
}): Promise<SetRegionResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid region." };

  const regions = await getActiveRegions();
  const region = regions.find((r) => r.code === parsed.data.region);
  if (!region) return { ok: false, error: "That region is not available." };
  const currency =
    parsed.data.currency && region.currencies.includes(parsed.data.currency)
      ? parsed.data.currency
      : region.defaultCurrency;

  const cookieStore = await cookies();
  const options = { path: "/", maxAge: REGION_COOKIE_MAX_AGE, sameSite: "lax" as const };
  cookieStore.set(REGION_COOKIE, region.code, options);
  cookieStore.set(CURRENCY_COOKIE, currency, options);

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) {
    await supabase
      .from("profiles")
      .update({ region_code: region.code, currency_code: currency })
      .eq("id", data.user.id);
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
