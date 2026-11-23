import "server-only";

import { cookies, headers } from "next/headers";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

import { CURRENCY_COOKIE, REGION_COOKIE } from "./constants";
import { resolveRegion, type RegionOption, type ResolvedRegion } from "./detect";

/** Active regions with their selectable currencies. Cached per request. */
export const getActiveRegions = cache(async (): Promise<RegionOption[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("regions")
    .select("code, name, default_currency, default_locale, sort_order, region_currencies(currency_code)")
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw new Error(`Could not load regions: ${error.message}`);
  return (data ?? []).map((r) => ({
    code: r.code,
    name: r.name,
    defaultCurrency: r.default_currency,
    defaultLocale: r.default_locale,
    currencies: [
      r.default_currency,
      ...r.region_currencies.map((c) => c.currency_code).filter((c) => c !== r.default_currency),
    ],
  }));
});

/** The signed-in user (or null). Cached per request. */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
});

/** The market and currency for this request. Cached per request. */
export const getRegion = cache(async (): Promise<ResolvedRegion> => {
  const [regions, cookieStore, headerStore, user] = await Promise.all([
    getActiveRegions(),
    cookies(),
    headers(),
    getCurrentUser(),
  ]);

  let profileRegion: string | null = null;
  let profileCurrency: string | null = null;
  if (user) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles")
      .select("region_code, currency_code")
      .eq("id", user.id)
      .maybeSingle();
    profileRegion = data?.region_code ?? null;
    profileCurrency = data?.currency_code ?? null;
  }

  return resolveRegion({
    regions,
    cookieRegion: cookieStore.get(REGION_COOKIE)?.value,
    cookieCurrency: cookieStore.get(CURRENCY_COOKIE)?.value,
    profileRegion,
    profileCurrency,
    ipCountry: headerStore.get("x-vercel-ip-country") ?? headerStore.get("cf-ipcountry"),
    acceptLanguage: headerStore.get("accept-language"),
    defaultRegion: process.env.NEXT_PUBLIC_DEFAULT_REGION,
  });
});
