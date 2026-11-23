"use client";

import { MapPin, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { setRegion } from "@/lib/region/actions";

import { useRegion } from "./region-provider";

/** First-visit notice: tells people which market we picked and lets them confirm or change it. */
export function RegionNotice() {
  const { regionCode, regionName, currency, regions } = useRegion();
  const [hidden, setHidden] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  if (hidden) return null;

  const confirm = (code: string) =>
    startTransition(async () => {
      await setRegion({ region: code });
      setHidden(true);
      router.refresh();
    });

  return (
    <div role="region" aria-label="Market selection" className="bg-muted/60 border-b">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2 text-sm">
        <MapPin className="text-primary size-4 shrink-0" aria-hidden />
        <p className="flex-1">
          Showing prices and retailers for <strong>{regionName}</strong> in {currency}.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => confirm(regionCode)} disabled={pending}>
            Keep {regionName}
          </Button>
          {regions
            .filter((r) => r.code !== regionCode)
            .map((r) => (
              <Button
                key={r.code}
                size="sm"
                variant="outline"
                onClick={() => confirm(r.code)}
                disabled={pending}
              >
                Switch to {r.name}
              </Button>
            ))}
          <Button
            size="icon"
            variant="ghost"
            className="size-8"
            onClick={() => setHidden(true)}
            aria-label="Dismiss"
          >
            <X className="size-4" aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  );
}
