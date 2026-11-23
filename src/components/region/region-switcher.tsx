"use client";

import { Check, Globe2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setRegion } from "@/lib/region/actions";
import { flagEmoji } from "@/lib/region/detect";

import { useRegion } from "./region-provider";

export function RegionSwitcher() {
  const { regionCode, currency, regions } = useRegion();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const choose = (region: string, cur?: string) =>
    startTransition(async () => {
      const result = await setRegion({ region, currency: cur });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });

  const current = regions.find((r) => r.code === regionCode);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5" aria-label={`Market: ${current?.name ?? regionCode}, ${currency}. Change`} data-testid="region-switcher">
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <span aria-hidden>{flagEmoji(regionCode)}</span>}
          <span className="font-medium">{regionCode}</span>
          <span className="text-muted-foreground">· {currency}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Globe2 className="size-4" aria-hidden /> Shopping in
        </DropdownMenuLabel>
        {regions.map((r) => (
          <DropdownMenuItem key={r.code} onSelect={() => choose(r.code)} disabled={pending}>
            <span aria-hidden>{flagEmoji(r.code)}</span>
            <span className="flex-1">{r.name}</span>
            <span className="text-muted-foreground text-xs">{r.defaultCurrency}</span>
            {r.code === regionCode && <Check className="size-4" aria-label="selected" />}
          </DropdownMenuItem>
        ))}
        {current && current.currencies.length > 1 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Show prices in</DropdownMenuLabel>
            {current.currencies.map((c) => (
              <DropdownMenuItem key={c} onSelect={() => choose(current.code, c)} disabled={pending}>
                <span className="flex-1">{c}</span>
                {c === currency && <Check className="size-4" aria-label="selected" />}
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
