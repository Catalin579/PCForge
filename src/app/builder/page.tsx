import type { Metadata } from "next";

import { BuilderClient } from "@/components/builder/builder-client";
import { getCategories } from "@/lib/catalog/queries";

export const metadata: Metadata = {
  title: "Builder",
  description: "Pick parts, check compatibility and see the total price in your market.",
};

export default async function BuilderPage() {
  const categories = await getCategories();
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight">Your build</h1>
      <p className="text-muted-foreground mt-1">
        Pick a part for each slot. Compatibility, power and prices update as you go.
      </p>
      <BuilderClient
        categories={categories.map((c) => ({
          slug: c.slug,
          name: c.name,
          pluralName: c.pluralName,
          icon: c.icon,
          isCore: c.isCore,
          maxPerBuild: c.maxPerBuild,
        }))}
      />
    </div>
  );
}
