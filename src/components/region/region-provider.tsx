"use client";

import { createContext, useContext, type ReactNode } from "react";

import { type RegionOption } from "@/lib/region/detect";

export type ClientRegion = {
  regionCode: string;
  regionName: string;
  currency: string;
  locale: string;
  regions: RegionOption[];
};

const RegionContext = createContext<ClientRegion | null>(null);

export function RegionProvider({ value, children }: { value: ClientRegion; children: ReactNode }) {
  return <RegionContext.Provider value={value}>{children}</RegionContext.Provider>;
}

export function useRegion(): ClientRegion {
  const ctx = useContext(RegionContext);
  if (!ctx) throw new Error("useRegion must be used inside RegionProvider");
  return ctx;
}
