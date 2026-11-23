"use client";

import { Check, Plus } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useBuilder, useBuilderHydrated } from "@/lib/builder/store";
import { type CategorySlug } from "@/lib/catalog/specs";

type Props = {
  variantId: string;
  productSlug: string;
  name: string;
  category: CategorySlug;
  categoryName: string;
  maxPerBuild: number | null;
  size?: "sm" | "default";
  className?: string;
};

export function AddToBuildButton({
  variantId,
  productSlug,
  name,
  category,
  categoryName,
  maxPerBuild,
  size = "sm",
  className,
}: Props) {
  const hydrated = useBuilderHydrated();
  const add = useBuilder((s) => s.add);
  const inBuild = useBuilder((s) => s.items.find((i) => i.variantId === variantId));
  const replacing = useBuilder((s) =>
    maxPerBuild === 1
      ? s.items.find((i) => i.category === category && i.variantId !== variantId)
      : undefined,
  );
  const single = maxPerBuild === 1;

  const onClick = () => {
    add({ variantId, productSlug, name, category }, { singlePerBuild: single, max: maxPerBuild });
    toast.success(replacing ? `Replaced ${replacing.name}` : `Added to your build`, {
      description: name,
      action: { label: "Open builder", onClick: () => (window.location.href = "/builder") },
    });
  };

  if (hydrated && inBuild && single) {
    return (
      <Button asChild size={size} variant="secondary" className={className}>
        <Link href="/builder" aria-label={`${name} is in your build. Open builder`}>
          <Check className="size-4" aria-hidden /> In build
        </Link>
      </Button>
    );
  }
  return (
    <Button
      size={size}
      onClick={onClick}
      className={className}
      aria-label={`Add ${name} to build as ${categoryName}`}
    >
      <Plus className="size-4" aria-hidden />
      {hydrated && inBuild ? `Add another (${inBuild.quantity})` : "Add to build"}
    </Button>
  );
}
