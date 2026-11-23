"use client";

import { Wrench } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useBuilder, useBuilderHydrated } from "@/lib/builder/store";

export function BuilderLink() {
  const hydrated = useBuilderHydrated();
  const count = useBuilder((s) => s.items.reduce((n, i) => n + i.quantity, 0));
  return (
    <Button asChild variant="ghost" size="sm" className="gap-1.5">
      <Link href="/builder" aria-label={hydrated && count ? `Builder, ${count} parts` : "Builder"}>
        <Wrench className="size-4" aria-hidden />
        <span className="hidden sm:inline">Builder</span>
        {hydrated && count > 0 && (
          <Badge className="h-5 min-w-5 px-1.5 tabular-nums" aria-hidden>
            {count}
          </Badge>
        )}
      </Link>
    </Button>
  );
}
