"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { type CategorySlug } from "@/lib/catalog/specs";

/**
 * Client-side state for the build being edited. Only identifiers and
 * quantities live here; prices and compatibility always come from the
 * server (POST /api/builds/evaluate).
 */
export type BuilderItem = {
  variantId: string;
  productSlug: string;
  name: string;
  category: CategorySlug;
  quantity: number;
  selectedOfferId?: string | null;
};

export type BuilderState = {
  items: BuilderItem[];
  /** Set when editing a saved build. */
  buildId: string | null;
  buildName: string | null;
  add: (
    item: Omit<BuilderItem, "quantity"> & { quantity?: number },
    opts: { singlePerBuild: boolean; max?: number | null },
  ) => void;
  remove: (variantId: string) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  selectOffer: (variantId: string, offerId: string | null) => void;
  load: (
    items: BuilderItem[],
    meta?: { buildId?: string | null; buildName?: string | null },
  ) => void;
  setSaved: (buildId: string, buildName: string) => void;
  clear: () => void;
};

export const MAX_QUANTITY = 16;

export const useBuilder = create<BuilderState>()(
  persist(
    (set) => ({
      items: [],
      buildId: null,
      buildName: null,
      add: (item, { singlePerBuild, max }) =>
        set((s) => {
          const quantity = item.quantity ?? 1;
          if (singlePerBuild) {
            return {
              items: [
                ...s.items.filter((i) => i.category !== item.category),
                { ...item, quantity: 1 },
              ],
            };
          }
          const existing = s.items.find((i) => i.variantId === item.variantId);
          const inCategory = s.items
            .filter((i) => i.category === item.category)
            .reduce((n, i) => n + i.quantity, 0);
          const room = Math.max(0, (max ?? MAX_QUANTITY) - inCategory);
          if (room === 0) return s;
          if (existing) {
            return {
              items: s.items.map((i) =>
                i.variantId === item.variantId
                  ? {
                      ...i,
                      quantity: Math.min(MAX_QUANTITY, i.quantity + Math.min(quantity, room)),
                    }
                  : i,
              ),
            };
          }
          return { items: [...s.items, { ...item, quantity: Math.min(quantity, room) }] };
        }),
      remove: (variantId) =>
        set((s) => ({ items: s.items.filter((i) => i.variantId !== variantId) })),
      setQuantity: (variantId, quantity) =>
        set((s) => ({
          items:
            quantity <= 0
              ? s.items.filter((i) => i.variantId !== variantId)
              : s.items.map((i) =>
                  i.variantId === variantId
                    ? { ...i, quantity: Math.min(MAX_QUANTITY, quantity) }
                    : i,
                ),
        })),
      selectOffer: (variantId, offerId) =>
        set((s) => ({
          items: s.items.map((i) =>
            i.variantId === variantId ? { ...i, selectedOfferId: offerId } : i,
          ),
        })),
      load: (items, meta) =>
        set({ items, buildId: meta?.buildId ?? null, buildName: meta?.buildName ?? null }),
      setSaved: (buildId, buildName) => set({ buildId, buildName }),
      clear: () => set({ items: [], buildId: null, buildName: null }),
    }),
    {
      name: "pcforge-builder",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ items: s.items, buildId: s.buildId, buildName: s.buildName }),
    },
  ),
);

/** True after the persisted builder state has loaded in the browser (avoids hydration mismatches). */
export function useBuilderHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    if (useBuilder.persist.hasHydrated()) setHydrated(true);
    return useBuilder.persist.onFinishHydration(() => setHydrated(true));
  }, []);
  return hydrated;
}
